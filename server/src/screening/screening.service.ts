import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { randomUUID } from 'crypto';
import { Prisma, RiskLevel, ScreeningStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { OsintService, OsintResult } from '../osint/osint.service';
import { AiExplainerService } from '../ai-explainer/ai-explainer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScreenQueryDto } from './dto/query-bulk-screening.dto';

const SIMILARITY_THRESHOLDS = {
  CRITICAL: 95,
  HIGH: 85,
  MEDIUM: 70,
  LOW: 50,
};

const CANDIDATE_FETCH_LIMIT = 500;

const TRIGRAM_PREFILTER = 0.15;

const CACHE_TTL_SECONDS = 900;

@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly aiExplainer: AiExplainerService,
    private readonly audit: AuditService,
    private readonly osint: OsintService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('bulk-screening-queue') private readonly bulkQueue: Queue,
  ) {}

  private normalize(str: string): string {
    return str
      .toLocaleLowerCase('tr-TR')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .trim();
  }

  public calculateSimilarity(str1: string, str2: string): number {
    const s1 = this.normalize(str1);
    const s2 = this.normalize(str2);

    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 100;

    const matrix: number[][] = Array.from({ length: s1.length + 1 }, () =>
      Array.from({ length: s2.length + 1 }, () => 0),
    );

    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] =
            Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]) +
            1;
        }
      }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    let score = 100 - (distance * 100) / maxLength;

    const tokens1 = s1.split(/\s+/).filter((t) => t.length >= 2);
    const tokens2 = s2.split(/\s+/).filter((t) => t.length >= 2);

    if (tokens1.length > 0 && tokens2.length > 0) {
      let matchedWeight = 0;
      for (const t1 of tokens1) {
        const exact = tokens2.some((t2) => t2 === t1);
        const contained =
          !exact &&
          tokens2.some(
            (t2) =>
              t1.length >= 3 &&
              t2.length >= 3 &&
              (t2.includes(t1) || t1.includes(t2)),
          );

        if (exact) matchedWeight += 1;
        else if (contained) matchedWeight += 0.6;
      }
      const tokenMatchRatio =
        matchedWeight / Math.max(tokens1.length, tokens2.length);
      const tokenScore = tokenMatchRatio * 100;

      if (tokenScore > score) {
        score = tokenScore;
      }
    }

    if (s1.includes(s2) || s2.includes(s1)) {
      const minLen = Math.min(s1.length, s2.length);
      if (minLen >= 4) {
        const lenRatio = minLen / maxLength;

        const substringScore = 50 + lenRatio * 45;
        if (substringScore > score) {
          score = substringScore;
        }
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= SIMILARITY_THRESHOLDS.CRITICAL) return RiskLevel.CRITICAL;
    if (score >= SIMILARITY_THRESHOLDS.HIGH) return RiskLevel.HIGH;
    if (score >= SIMILARITY_THRESHOLDS.MEDIUM) return RiskLevel.MEDIUM;
    if (score >= SIMILARITY_THRESHOLDS.LOW) return RiskLevel.LOW;
    return RiskLevel.CLEAR;
  }

  async screen(dto: ScreenQueryDto, userId: string, orgId: string) {
    const queryName = (dto.queryName || (dto as any).name || '').trim();
    const entityType = dto.entityType;

    if (!queryName) {
      throw new Error('Query name is required for screening.');
    }

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: { settings: true },
    });

    const orgThreshold = Math.max(
      org.settings?.aiThreshold || SIMILARITY_THRESHOLDS.LOW,
      SIMILARITY_THRESHOLDS.LOW,
    );

    const normalizedQuery = this.normalize(queryName).replace(/\s+/g, '_');

    const cacheKey = `screen:v4:${orgId}:${normalizedQuery}:${entityType || 'ALL'}:${orgThreshold}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return { ...JSON.parse(cached), fromCache: true };

    const rawMatches = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM (
        SELECT 
          id, name AS "searchName", "entityType", country, programs, "listSource", 'name' AS "field",
          similarity(name, ${queryName}) AS "trigramScore"
        FROM "SanctionedEntity"
        WHERE "isActive" = true 
          ${entityType ? Prisma.sql`AND "entityType" = ${entityType}` : Prisma.empty}
          AND (
            similarity(name, ${queryName}) >= ${TRIGRAM_PREFILTER}
            OR name ILIKE ${'%' + queryName + '%'}
          )

        UNION ALL

        SELECT 
          id, a AS "searchName", "entityType", country, programs, "listSource", 'alias' AS "field",
          similarity(a, ${queryName}) AS "trigramScore"
        FROM "SanctionedEntity", unnest("aliases") a
        WHERE "isActive" = true 
          ${entityType ? Prisma.sql`AND "entityType" = ${entityType}` : Prisma.empty}
          AND (
            similarity(a, ${queryName}) >= ${TRIGRAM_PREFILTER}
            OR a ILIKE ${'%' + queryName + '%'}
          )
      ) candidates
      ORDER BY "trigramScore" DESC
      LIMIT ${CANDIDATE_FETCH_LIMIT};
    `;

    const byEntity = new Map<string, any>();

    for (const row of rawMatches) {
      const exactScore = this.calculateSimilarity(queryName, row.searchName);
      const existing = byEntity.get(row.id);

      if (!existing || exactScore > existing.score) {
        byEntity.set(row.id, {
          id: row.id,
          matchedName: row.searchName,
          matchedField: row.field,
          entityType: row.entityType,
          listSource: row.listSource,
          country: row.country,
          programs: row.programs,
          score: exactScore,
        });
      }
    }

    const topMatches = Array.from(byEntity.values())
      .filter((m) => m.score >= orgThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const highestScore = topMatches.length > 0 ? topMatches[0].score : 0;
    const riskLevel = this.determineRiskLevel(highestScore);

    let osintResults: OsintResult | null = null;
    let aiExplanation: string | null = null;

    if (riskLevel !== RiskLevel.CLEAR && topMatches.length > 0) {
      try {
        osintResults = await this.osint.fetchResults(
          queryName,
          highestScore / 100,
          orgThreshold / 100,
          org.settings?.osintApiKey || undefined,
        );
      } catch (error) {
        this.logger.warn(`OSINT fetch failed for ${queryName}`);
      }

      try {
        aiExplanation = await this.aiExplainer.explain({
          queryName,
          matches: topMatches.slice(0, 3).map((m) => ({
            matchedName: m.matchedName,
            similarityScore: m.score / 100,
            listSource: m.listSource,
            entityType: m.entityType,
            country: m.country,
            programs: m.programs,
          })),
          riskLevel,
          userApiKey: org.settings?.aiApiKey || '',
          provider: org.settings?.aiProvider || 'OPENAI',
        });
      } catch (error: any) {
        this.logger.error(`AI Explanation failed: ${error.message}`);
        aiExplanation = 'AI explanation temporarily unavailable.';
      }
    }

    const queryRecord = await this.prisma.screeningQuery.create({
      data: {
        queryName,
        status: ScreeningStatus.COMPLETED,
        riskLevel,
        matchCount: topMatches.length,
        aiExplanation,
        osintResults: osintResults ? (osintResults as any) : Prisma.JsonNull,
        userId,
        orgId,
        matches: {
          create: topMatches.map((m) => ({
            matchedEntityId: m.id,
            matchedName: m.matchedName,
            similarityScore: m.score / 100,
            matchedField: m.matchedField,
            listSource: m.listSource,
          })),
        },
      },
      include: { matches: true },
    });

    await this.audit.log({
      action: 'SCREENING_PERFORMED',
      actorId: userId,
      orgId,
      queryId: queryRecord.id,
      metadata: { queryName, riskLevel, matchCount: topMatches.length },
    });

    const finalResult = {
      query: queryRecord,
      riskLevel,
      aiExplanation,
      osintResults,
      matches: topMatches,
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(finalResult),
      CACHE_TTL_SECONDS,
    );

    return { ...finalResult, fromCache: false };
  }

  async bulkScreen(
    dto: { names: string[]; entityType?: string },
    userId: string,
    orgId: string,
  ) {
    const batchId = randomUUID();
    const jobs = dto.names.map((name) => ({
      name: 'screen-single-name',
      data: { name, entityType: dto.entityType, userId, orgId, batchId },
    }));

    await this.bulkQueue.addBulk(jobs);

    await this.audit.log({
      action: 'BULK_SCREENING_QUEUED',
      actorId: userId,
      orgId,
      metadata: { count: dto.names.length, batchId },
    });

    return {
      message: 'Bulk screening queued. Processing in background.',
      batchId,
      totalQueued: dto.names.length,
      estimatedMinutes: Math.ceil(dto.names.length / 30),
    };
  }

  async getHistory(
    orgId: string,
    page = 1,
    limit = 20,
    filters?: { riskLevel?: RiskLevel; queryName?: string },
  ) {
    const where: Prisma.ScreeningQueryWhereInput = { orgId };

    if (filters?.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters?.queryName)
      where.queryName = { contains: filters.queryName, mode: 'insensitive' };

    const [queries, total] = await Promise.all([
      this.prisma.screeningQuery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { matches: true },
      }),
      this.prisma.screeningQuery.count({ where }),
    ]);

    return { queries, total, page, pages: Math.ceil(total / limit) };
  }

  async clearCache(pattern: string = 'screen:*'): Promise<number> {
    try {
      await this.redis.delByPattern(pattern);
      this.logger.log(`Cache cleared for pattern: ${pattern}`);
      return 1;
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error}`);
      return 0;
    }
  }
}
