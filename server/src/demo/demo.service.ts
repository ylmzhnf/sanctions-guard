import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AiProvider, ListSource, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';

const DEMO_ORG_NAME = 'Demo Workspace';
const DEMO_USER_NAME = 'Demo Analyst';
const DEFAULT_SESSION_TTL_HOURS = 24;

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async provisionSession() {
    const suffix = randomUUID();
    const orgId = `demo-org-${suffix}`;
    const userId = `demo-user-${suffix}`;
    const email = `demo-${suffix}@demo.sanctions-guard.local`;

    const aiProvider =
      process.env.DEMO_AI_PROVIDER === 'ANTHROPIC'
        ? AiProvider.ANTHROPIC
        : AiProvider.OPENAI;
    const aiApiKey =
      (aiProvider === AiProvider.ANTHROPIC
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY) || null;
    const osintApiKey = process.env.SERPER_API_KEY || null;

    const passwordHash = await bcrypt.hash(randomUUID() + randomUUID(), 12);

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          id: orgId,
          name: DEMO_ORG_NAME,
          isDemo: true,
          settings: {
            create: {
              aiProvider,
              aiApiKey,
              osintApiKey,
              aiThreshold: 50,
              activeListSources: [
                ListSource.OFAC,
                ListSource.EU,
                ListSource.UN,
                ListSource.UK_HMT,
              ],
            },
          },
        },
      });

      const user = await tx.user.create({
        data: {
          id: userId,
          email,
          name: DEMO_USER_NAME,
          passwordHash,
          role: Role.ADMIN,
          isActive: true,
          isDemo: true,
          orgId: org.id,
        },
        include: { organization: true },
      });

      return { user, org };
    });
  }

  async purgeExpiredSessions() {
    const ttlHours = Number(
      process.env.DEMO_SESSION_TTL_HOURS || DEFAULT_SESSION_TTL_HOURS,
    );
    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

    try {
      const result = await this.prisma.organization.deleteMany({
        where: { isDemo: true, createdAt: { lt: cutoff } },
      });

      if (result.count > 0) {
        this.logger.log(
          `Demo cleanup: removed ${result.count} expired workspace(s) older than ${ttlHours}h.`,
        );
      }

      return { removed: result.count };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown cleanup error';
      this.logger.error(`Demo cleanup failed: ${message}`);
      return { removed: 0, error: message };
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledPurge() {
    await this.purgeExpiredSessions();
  }
}
