import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getConfig(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { aiThreshold: true, aiApiKey: true, aiProvider: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const rawKey = org.aiApiKey || '';
    const maskedKey =
      rawKey.length > 8 ? `••••••••••••••••••••${rawKey.slice(-4)}` : '';

    return {
      threshold: org.aiThreshold || 85,
      hasApiKey: !!rawKey,
      maskedApiKey: maskedKey,
      provider: org.aiProvider || 'OPENAI',
    };
  }

  async updateConfig(
    orgId: string,
    data: { threshold?: number; aiApiKey?: string },
  ) {
    const updateData: any = {};

    if (data.threshold) {
      updateData.aiThreshold = Number(data.threshold);
    }

    if (data.aiApiKey !== undefined) {
      updateData.aiApiKey =
        data.aiApiKey.trim() === '' ? null : data.aiApiKey.trim();
    }

    await this.prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return { success: true };
  }
}
