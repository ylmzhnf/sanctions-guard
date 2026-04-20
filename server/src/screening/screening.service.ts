import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListSource, ScreeningStatus, RiskLevel as PrismaRiskLevel } from '@prisma/client';

interface RawSanctionResult {
  id: string;
  name: string;
  score: number;
  listSource: ListSource;
  reason: string;
  country: string;
  createdAt: Date;
}
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Exact Match' | 'Clear';

@Injectable()
export class ScreeningService {
  constructor(private prisma: PrismaService) { }

  calculateSimilarity(str1: string, str2: string): number {
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
            Math.min(
              matrix[i - 1][j],
              matrix[i][j - 1],
              matrix[i - 1][j - 1],
            ) + 1;
        }
      }
    }
    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 100 - (distance * 100) / maxLength;
  }

  determineRiskLevel(score: number): RiskLevel {
    if (score >= 95) return 'Exact Match';
    if (score >= 85) return 'High';
    if (score >= 70) return 'Medium';
    if (score > 0) return 'Low';
    return 'Clear';
  }

  mapToPrismaRiskLevel(risk: RiskLevel): PrismaRiskLevel {
    switch (risk) {
      case 'Exact Match': return PrismaRiskLevel.CRITICAL;
      case 'High': return PrismaRiskLevel.HIGH;
      case 'Medium': return PrismaRiskLevel.MEDIUM;
      case 'Low': return PrismaRiskLevel.LOW;
      default: return PrismaRiskLevel.CLEAR;
    }
  }

  async searchSanctionedNames(queryName: string, userId: string, orgId: string) {
    const result = await this.prisma.$queryRaw<RawSanctionResult[]>`
    SELECT 
    id, 
    "name", 
    "listSource",     
    "reason",     
    "country", 
    "createdAt", 
    similarity("name", ${queryName}) AS score
    FROM "SanctionedEntity" 
    WHERE "name" % ${queryName} AND similarity ("name", ${queryName}) > 0.3
    ORDER BY score DESC 
    LIMIT 50;`;

    const refineResults = result.map((item) => {
      const levenshteinScore = this.calculateSimilarity(
        queryName,
        item.name,
      );
      return {
        ...item,
        score: levenshteinScore,
        riskLevel: this.determineRiskLevel(levenshteinScore),
      };
    });

    refineResults.sort((a, b) => b.score - a.score);

    const bestMatch = refineResults.length > 0 ? refineResults[0] : null;
    const finalRiskLevel = bestMatch ? this.determineRiskLevel(bestMatch.score) : 'Clear';

    // Save Screening Query and Matches
    const screeningQuery = await this.prisma.screeningQuery.create({
      data: {
        searchedName: queryName,
        userId: userId,
        orgId: orgId,
        status: ScreeningStatus.COMPLETED,
        matchedCount: refineResults.length,
        riskLevel: this.mapToPrismaRiskLevel(finalRiskLevel),
        matches: {
          create: refineResults.slice(0, 10).map((match) => ({
            matchedEntityId: match.id,
            matchedName: match.name,
            similarityScore: match.score,
            matchedField: 'name',
            listSource: match.listSource,
          })),
        },
      },
    });

    return {
      results: refineResults,
      queryId: screeningQuery.id,
      riskLevel: finalRiskLevel
    };
  }
}
