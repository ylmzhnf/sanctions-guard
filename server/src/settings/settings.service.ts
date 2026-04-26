import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(orgId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { orgId },
      select: { aiThreshold: true, aiApiKey: true, aiProvider: true },
    });

    if (!settings)
      throw new NotFoundException('Organization settings not found');

    const rawKey = settings.aiApiKey || '';
    const maskedKey = rawKey.length > 8 ? `sk-...${rawKey.slice(-4)}` : '';

    return {
      threshold: settings.aiThreshold ?? 85,
      provider: settings.aiProvider || 'OPENAI',
      hasApiKey: !!settings.aiApiKey,
      maskedApiKey: maskedKey,
    };
  }

  async updateConfig(orgId: string, dto: UpdateSettingsDto) {
    const aiApiKey =
      dto.aiApiKey !== undefined
        ? dto.aiApiKey.trim() === ''
          ? null
          : dto.aiApiKey.trim()
        : undefined;

    await this.prisma.organizationSettings.upsert({
      where: { orgId },
      update: {
        aiThreshold: dto.threshold,
        aiProvider: dto.aiProvider,
        aiApiKey,
      },
      create: {
        orgId,
        aiThreshold: dto.threshold ?? 85,
        aiProvider: dto.aiProvider ?? 'OPENAI',
        aiApiKey: aiApiKey ?? null,
      },
    });

    return { success: true, message: 'Settings updated successfully' };
  }
}
