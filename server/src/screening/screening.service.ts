import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { randomUUID } from 'crypto';
import { Prisma, RiskLevel, ScreeningStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { OsintService, OsintResult } from '../osint/osint.service';
import { AiExplainerService } from '../ai-explainer/ai-explainer.service';
import { ScreenQueryDto } from './dto/screen-query.dto';

const SIMILARITY_THRESHOLDS = {
  CRITICAL: 95,
  HIGH: 85,
  MEDIUM: 70,
  LOW: 50,
};

const PLAN_LIMITS: Record<string, number> = {
  FREE: 10,
  STARTER: 500,
  BUSINESS: 1000000,
  ENTERPRISE: 1000000,
  SELF_HOSTED: 999999999,
};

@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly aiExplainer: AiExplainerService,
    private readonly audit: AuditService,
    private readonly osint: OsintService,
    @InjectQueue('bulk-screening-queue') private readonly bulkQueue: Queue,
  ) {}

  public calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 100;

    const matrix: number[][] = Array.from(
      { length: s1.length + 1 },
      (): number[] => Array.from({ length: s2.length + 1 }, (): number => 0),
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
    return 100 - (distance * 100) / maxLength;
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= SIMILARITY_THRESHOLDS.CRITICAL) return RiskLevel.CRITICAL;
    if (score >= SIMILARITY_THRESHOLDS.HIGH) return RiskLevel.HIGH;
    if (score >= SIMILARITY_THRESHOLDS.MEDIUM) return RiskLevel.MEDIUM;
    if (score > SIMILARITY_THRESHOLDS.LOW) return RiskLevel.LOW;
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

    if (process.env.APP_MODE !== 'enterprise' && !org.isUnlimited) {
      const limit = PLAN_LIMITS[org.plan] || 10;
      if (org.queriesUsed >= limit) {
        throw new ForbiddenException(
          `Query limit reached for your ${org.plan} plan.`,
        );
      }
    }

    const cacheKey = `screening:${orgId}:${queryName.replace(/\s+/g, '_')}:${entityType || 'ALL'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const candidates = entityType
      ? await this.prisma.$queryRaw<any[]>`
      SELECT 
        id, "name", "aliases", "entityType", "country", "programs", "listSource",
        GREATEST(
          similarity("name", ${queryName}),
          (SELECT MAX(similarity(a, ${queryName})) FROM unnest("aliases") a)
        ) as raw_score
      FROM "SanctionedEntity" 
      WHERE "isActive" = true 
        AND (
          "name" % ${queryName} 
          OR 
          EXISTS (SELECT 1 FROM unnest("aliases") a WHERE a % ${queryName})
        )
        AND "entityType" = ${entityType}
      ORDER BY raw_score DESC
      LIMIT 50;
    `
      : await this.prisma.$queryRaw<any[]>`
      SELECT 
        id, "name", "aliases", "entityType", "country", "programs", "listSource",
        GREATEST(
          similarity("name", ${queryName}),
          (SELECT MAX(similarity(a, ${queryName})) FROM unnest("aliases") a)
        ) as raw_score
      FROM "SanctionedEntity" 
      WHERE "isActive" = true 
        AND (
          "name" % ${queryName} 
          OR 
          EXISTS (SELECT 1 FROM unnest("aliases") a WHERE a % ${queryName})
        )
      ORDER BY raw_score DESC
      LIMIT 50;
    `;

    const refineResults = candidates.map((entity: any) => {
      let bestScore = this.calculateSimilarity(queryName, entity.name);
      let matchedField = 'name';
      let matchedName: string = entity.name;

      (entity.aliases || []).forEach((alias: string) => {
        const s = this.calculateSimilarity(queryName, alias);
        if (s > bestScore) {
          bestScore = s;
          matchedName = alias;
          matchedField = 'alias';
        }
      });
      return { ...entity, score: bestScore, matchedName, matchedField };
    });

    const threshold = org.settings?.aiThreshold || 45;
    const topMatches = refineResults
      .filter((r) => r.score > threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const highestScore = topMatches.length > 0 ? topMatches[0].score : 0;
    const riskLevel = this.determineRiskLevel(highestScore);

    let osintResults: OsintResult | null = null;
    if (org.settings?.enableOsint !== false) {
      try {
        osintResults = await this.osint.fetchResults(queryName);
      } catch (error) {
        this.logger.warn(`OSINT fetch failed for ${queryName}`);
      }
    }

    let aiExplanation: string | null = null;
    if (riskLevel !== RiskLevel.CLEAR && topMatches.length > 0) {
      try {
        aiExplanation = await this.aiExplainer.explain({
          queryName,
          matches: topMatches.slice(0, 3).map((m) => ({
            name: m.matchedName,
            similarity: m.score,
            source: m.listSource,
            entityType: m.entityType,
            country: m.country,
            programs: m.programs,
          })),
          riskLevel,
          userApiKey: org.settings?.aiApiKey || '',
          provider: org.settings?.aiProvider || 'OPENAI',
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`AI Explanation failed: ${errorMessage}`);
        aiExplanation = 'AI explanation temporarily unavailable.';
      }
    }

    const queryRecord = await this.prisma.$transaction(async (tx) => {
      const createdQuery = await tx.screeningQuery.create({
        data: {
          queryName,
          status: ScreeningStatus.COMPLETED,
          riskLevel,
          matchedCount: topMatches.length,
          aiExplanation,
          osintResults: osintResults
            ? (osintResults as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          userId,
          orgId,
          matches: {
            create: topMatches.map((m) => ({
              matchedEntityId: m.id,
              matchedName: m.matchedName,
              similarityScore: m.score,
              matchedField: m.matchedField,
              listSource: m.listSource,
            })),
          },
        },
        include: { matches: true },
      });

      await tx.organization.update({
        where: { id: orgId },
        data: { queriesUsed: { increment: 1 } },
      });

      return createdQuery;
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

    await this.redis.set(cacheKey, JSON.stringify(finalResult), 3600);

    return finalResult;
  }

  async bulkScreen(
    dto: { names: string[]; entityType?: string },
    userId: string,
    orgId: string,
  ) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });

    if (process.env.APP_MODE !== 'enterprise' && !org.isUnlimited) {
      if (org.plan !== 'BUSINESS' && org.plan !== 'ENTERPRISE') {
        throw new ForbiddenException(
          'Bulk screening is a Business/Enterprise feature.',
        );
      }
    }

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
      message: 'Tarama işlemi kuyruğa alındı. Arka planda işleniyor.',
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

    if (filters?.riskLevel) {
      where.riskLevel = filters.riskLevel;
    }

    if (filters?.queryName) {
      where.queryName = { contains: filters.queryName, mode: 'insensitive' };
    }

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
}
