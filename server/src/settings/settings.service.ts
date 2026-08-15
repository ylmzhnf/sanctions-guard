import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AiProvider } from '@prisma/client';


const DEFAULTS = {
  THRESHOLD: 85,
  PROVIDER: AiProvider.OPENAI,
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(orgId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { orgId },
    });

    
    if (!settings) {
      return {
        threshold: DEFAULTS.THRESHOLD,
        provider: DEFAULTS.PROVIDER,
        hasAiKey: false,
        maskedAiKey: '',
        hasOsintKey: false,
        maskedOsintKey: '',
      };
    }

    return {
      threshold: settings.aiThreshold ?? DEFAULTS.THRESHOLD,
      provider: settings.aiProvider ?? DEFAULTS.PROVIDER,
      hasAiKey: !!settings.aiApiKey,
      maskedAiKey: this.maskKey(settings.aiApiKey, 'sk-'),
      hasOsintKey: !!settings.osintApiKey,
      maskedOsintKey: this.maskKey(settings.osintApiKey, '***'),
    };
  }

  async updateConfig(orgId: string, dto: UpdateSettingsDto) {
    
    const aiApiKey = this.processKey(dto.aiApiKey);
    const osintApiKey = this.processKey(dto.osintApiKey);

    return await this.prisma.organizationSettings.upsert({
      where: { orgId },
      update: {
        aiThreshold: dto.threshold,
        aiProvider: dto.aiProvider,
        aiApiKey,
        osintApiKey,
      },
      create: {
        orgId,
        aiThreshold: dto.threshold ?? DEFAULTS.THRESHOLD,
        aiProvider: dto.aiProvider ?? DEFAULTS.PROVIDER,
        aiApiKey: aiApiKey ?? null,
        osintApiKey: osintApiKey ?? null,
      },
    });
  }

  
  private maskKey(key: string | null | undefined, prefix: string): string {
    if (!key || key.length < 8) return '';
    return `${prefix}...${key.slice(-4)}`;
  }

  
  private processKey(key?: string): string | null | undefined {
    if (key === undefined) return undefined;
    return key.trim() === '' ? null : key.trim();
  }
}