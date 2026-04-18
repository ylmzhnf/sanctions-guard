import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '@prisma/client';

@Injectable()
export class AppSumoService {
  private readonly logger = new Logger(AppSumoService.name);

  constructor(private prisma: PrismaService) {}

  async redeemCode(orgId: string, code: string) {
    const cleanCode = code.trim().toUpperCase();

    const appSumoCode = await this.prisma.appSumoCode.findUnique({
      where: { code: cleanCode },
    });

    if (!appSumoCode) {
      throw new BadRequestException('Geçersiz lisans kodu.');
    }

    if (appSumoCode.isUsed) {
      throw new BadRequestException('Bu kod daha önce kullanılmış.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new BadRequestException('Organizasyon bulunamadı.');
    }
    if (org.isLifetime) {
      throw new BadRequestException(
        'Bu organizasyon zaten ömür boyu (Lifetime) lisansa sahip.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.appSumoCode.update({
        where: { id: appSumoCode.id },
        data: { isUsed: true, usedAt: new Date(), orgId: orgId },
      }),
      this.prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: Plan.ENTERPRISE,
          isLifetime: true,
          queriesLimit: 999_999,
          queriesUsed: 0,
        },
      }),
    ]);

    this.logger.log(
      `🎉 AppSumo satışı gerçekleşti! Org: ${orgId}, Kod: ${cleanCode}`,
    );
    return {
      success: true,
      message: 'Ömür boyu lisansınız başarıyla aktifleştirildi!',
    };
  }
}
