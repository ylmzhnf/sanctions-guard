import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScreeningService {
  constructor(private prisma: PrismaService) {}

  calculateSimilarity(str1: string, str2: string): number {
    // 1. Küçük harfe çevirme ve boşluk kontrolü
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 100;

    // 2. Matris oluşturma
    const matrix: number[][] = Array.from(
      { length: s1.length + 1 },
      (): number[] => Array.from({ length: s2.length + 1 }, (): number => 0),
    );

    // 3. Başlangıç  değerlerini doldurma
    for (let i = 0; i <= s1.length; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    // 4. Fark hesaplama
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          // Harfler aynıysa çaprazdaki maliyet aynen geçer
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          // Harfler farklıysa en küçük maliyetli işlemi seç ve +1 ekle
          matrix[i][j] =
            Math.min(
              matrix[i - 1][j], //sil
              matrix[i][j - 1], //ekle
              matrix[i - 1][j - 1], //degistir
            ) + 1;
        }
      }
    }
    // 5. Mesafe değerini yüzdeye cevirme 📈
    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 100 - (distance * 100) / maxLength;
  }
  //pg_trigam
  async searchSanctionedNames(queryName: string, userId: number) {
    const result = await this.prisma.$queryRaw<
      { id: number; fullName: string; score: number }[]
    >`
    SELECT id, fullName, similarity(fullName, ${queryName}) AS score
    FROM "SanctionList" 
    WHERE fullName % ${queryName} AND similarity (fullName, ${queryName}) > 0.3
    ORDER BY score DESC 
    LIMIT 10;`;
    const bestMatch = result.length > 0 ? result[0] : null;
    await this.prisma.auditLog.create({
      data: {
        queriedName: queryName,
        matchedName: bestMatch?.fullName || null,
        similarityScore: bestMatch?.score || 0,
        userId: userId,
        sanctionId: bestMatch?.id || null,
      },
    });
    return result;
  }
}
