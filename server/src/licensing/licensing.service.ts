import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { LicenseType, Plan, Prisma } from '@prisma/client';
import { LicenseAssignDto } from '../licensing/dto/license-assign.dto';

export interface LicenseStatus {
  hasAccess: boolean;
  type: LicenseType;
  creditsRemaining: number | null;
  queriesUsed: number;
  queriesLimit: number;
  plan: Plan;
  expiresAt: Date | null;
  isUnlimited: boolean;
}

@Injectable()
export class LicensingService {
  private readonly logger = new Logger(LicensingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  
  async assignLicense(dto: LicenseAssignDto & { issuedById: string }): Promise<void> {
    const { orgId, type, credits, expiresAt, notes, issuedById } = dto;

    await this.prisma.$transaction(async (tx) => {
      
      await tx.license.updateMany({
        where: { orgId, isActive: true },
        data: { isActive: false },
      });

      
      await tx.license.create({
        data: {
          type,
          credits: type === LicenseType.UNLIMITED ? null : (credits ?? null),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true,
          notes,
          issuedById,
          orgId,
        },
      });

      
      const isUnlimited = type === LicenseType.UNLIMITED;
      const queryLimit = isUnlimited ? -1 : (credits ?? 10);
      
      await tx.organization.update({
        where: { id: orgId },
        data: {
          queriesLimit: queryLimit,
          isUnlimited: isUnlimited,
          queriesUsed: 0, 
          plan: isUnlimited ? Plan.ENTERPRISE : Plan.ENTERPRISE,
        },
      });
    });

    this.logger.log(`[License] Assigned to Org: ${orgId}, Type: ${type}, Limit: ${dto.credits ?? 'Unlimited'}`);
  }

  
  async checkAndConsume(orgId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { queriesUsed: true, queriesLimit: true, isUnlimited: true },
    });

    if (!org) throw new BadRequestException('Organization not found');

    
    if (this.config.isEnterprise() || org.isUnlimited || org.queriesLimit === -1) {
      
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { queriesUsed: { increment: 1 } },
      });
      return;
    }

    
    if (org.queriesUsed >= org.queriesLimit) {
      throw new ForbiddenException(
        `Aylık tarama limitiniz (${org.queriesLimit}) dolmuştur. Lütfen planınızı yükseltin.`,
      );
    }

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { queriesUsed: { increment: 1 } },
    });
  }

  
  async getLicenseStatus(orgId: string): Promise<LicenseStatus> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: {
        licenses: {
          where: { isActive: true },
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
      },
    });

    const activeLicense = org.licenses[0];
    const isUnlimited = this.config.isEnterprise() || org.isUnlimited || org.queriesLimit === -1;

    return {
      hasAccess: true, 
      type: activeLicense?.type ?? LicenseType.SUBSCRIPTION,
      creditsRemaining: isUnlimited ? null : Math.max(0, org.queriesLimit - org.queriesUsed),
      queriesUsed: org.queriesUsed,
      queriesLimit: org.queriesLimit,
      plan: org.plan,
      expiresAt: activeLicense?.expiresAt ?? org.billingPeriodEnd ?? null,
      isUnlimited,
    };
  }

  
  async revokeLicense(orgId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.license.updateMany({
        where: { orgId, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.organization.update({
        where: { id: orgId },
        data: { queriesLimit: 0, plan: Plan.FREE, isUnlimited: false },
      }),
    ]);
    
    this.logger.warn(`[License] All active licenses revoked for Org: ${orgId}`);
  }

  
  async listAll(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.license.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: { org: { select: { name: true } } },
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.license.count(),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }
}