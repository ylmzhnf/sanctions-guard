import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListSource, ScreeningStatus, RiskLevel } from '@prisma/client';
import { RedisService } from 'src/common/redis/redis.service';
import { AuditService } from 'src/audit/audit.service';
import { ScreenQueryDto } from './dto/screen-query.dto';
import { matches } from 'class-validator';

const PLAN_LIMITS = {
  FREE: 10,
  STARTER: 500,
  BUSINESS: Infinity,
  ENTERPRISE: Infinity,
};
@Injectable()
export class ScreeningService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private aiExplainer: AiExplainerService, 
    private audit: AuditService,
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

    for (let i = 0; i <= s1.length; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

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
    if (score >= 95) return RiskLevel.CRITICAL;
    if (score >= 85) return RiskLevel.HIGH;
    if (score >= 70) return RiskLevel.MEDIUM;
    if (score > 50) return RiskLevel.LOW;
    return RiskLevel.CLEAR;
  }

  async screen(dto: ScreenQueryDto, userId: string, orgId: string) {
    const queryName = dto.name.trim();

    //Plan Limits

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
    if (org.queriesUsed >= PLAN_LIMITS[org.plan]) {
      throw new ForbiddenException(
        `Query limit reached for your ${org.plan} plan.`,
      );
    }

    //Caching with Redis

    const cacheKey = `screening:${orgId}:${queryName}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    //pg_trgm based candidate retrieval
    const candidates = await this.prisma.$queryRaw<any[]>`
    SELECT 
    id, 
    "name", 
    "aliases",     
    "entityType",     
    "country", 
    "programs",
    "reason",
    "listSource"
    FROM "SanctionedEntity" 
    WHERE "isActive" = true 
        AND (
          "name" % ${queryName} 
          OR 
          array_to_string("aliases", ' ') % ${queryName}
        )
    ORDER BY "name" <-> ${queryName}
    LIMIT 50;`;

    const refineResults = candidates.map((entity) => {
      let bestScore = this.calculateSimilarity(queryName, entity.name);
      let matchedField = 'name';
      let matchedName = entity.name;

      for (const alias of entity.aliases || []) {
        const aliasScore = this.calculateSimilarity(queryName, alias);
        if (aliasScore > bestScore) {
          bestScore = aliasScore;
          matchedField = 'alias';
          matchedName = alias;
        }
      }
      return {
        ...entity,
        score: bestScore,
        matchedField,
        matchedName,
      };
    });



    const topMatches = refineResults
      .filter((r) => r.score > 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    
    const highestScore = topMatches.length > 0 ? topMatches[0].score : 0;

    const riskLevel = this.determineRiskLevel(highestScore);

    let aiExplanation: string | null = null;
    if (riskLevel !== RiskLevel.CLEAR && topMatches.length > 0) {
      aiExplanation = await this.aiExplainer.explain({
        queryName: queryName,
        matches: topMatches.slice(0, 3).map((m) => ({
          name: m.matchedName,
          similarity: m.score,
          source: m.listSource,
          entityType: m.entityType,
          country: m.country,
          programs: m.programs,
        })),
        riskLevel,
        userApiKey: org.aiApiKey || '',
        provider: org.aiProvider,
      });
    }

    const queryRecord = await this.prisma.screeningQuery.create({
      data: {
        queryName: queryName,
        status: ScreeningStatus.COMPLETED,
        riskLevel,
        matchedCount: topMatches.length,
        aiExplanation,
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

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { queriesUsed: { increment: 1 } },
    });

    await this.audit.log({
      action: 'SCREENING_PERFORMED',
      userId: userId,
      orgId,
      queryId: queryRecord.id,
      metadata: {
        queryName,
        riskLevel,
        matchedCount: topMatches.length,
      },
    });

    const finalResult = {
      queryId: queryRecord.id,
      queryName,
      riskLevel,
      aiExplanation,
      matches: topMatches,
    };
    await this.redis.set(cacheKey, JSON.stringify(finalResult), 3600);

    return finalResult;
    
  }
}
