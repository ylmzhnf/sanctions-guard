import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { LicensingService } from '../licensing/licensing.service';
import { Plan, Role, Prisma, LicenseType } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly licensing: LicensingService,
  ) {}

  
  async getSystemOverview() {
    const meta = await this.prisma.appMetadata.findUnique({ where: { id: 'singleton' } });
    
    const [stats, byRisk] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*) FROM "User") as "totalUsers",
          (SELECT COUNT(*) FROM "Organization") as "totalOrgs",
          (SELECT COUNT(*) FROM "ScreeningQuery") as "totalQueries",
          (SELECT SUM("queriesUsed") FROM "Organization") as "systemUsage"
      `,
      this.prisma.screeningQuery.groupBy({
        by: ['riskLevel'],
        _count: true,
      }),
    ]);

    return {
      appMode: this.config.mode, 
      version: meta?.version || '1.0.0',
      installedAt: meta?.installedAt,
      stats: (stats as any[])[0],
      riskDistribution: byRisk,
    };
  }

  
  async listOrganizations(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { users: true, queries: true } },
          settings: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count(),
    ]);

    return { items, meta: { total, page, pages: Math.ceil(total / limit) } };
  }

  async createOrganization(dto: { name: string; queryLimit?: number }) {
    
    const isEnterprise = this.config.isEnterprise();
    const queryLimit = isEnterprise ? -1 : (dto.queryLimit ?? 10);
    const plan = isEnterprise ? Plan.ENTERPRISE : Plan.FREE;

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        plan: plan,
        queriesLimit: queryLimit,
        isUnlimited: isEnterprise,
        
        settings: { create: {} } 
      },
    });
  }

  async updateOrganizationLimits(
    orgId: string,
    dto: { plan?: string; queriesLimit?: number; isUnlimited?: boolean; queriesUsed?: number },
    adminId?: string,
  ) {
    const isUnlimited =
      dto.isUnlimited === true || dto.plan === 'ENTERPRISE' || dto.queriesLimit === -1;

    const orgData: Prisma.OrganizationUpdateInput = {};
    if (dto.plan) orgData.plan = dto.plan as Plan;
    if (dto.queriesUsed !== undefined) orgData.queriesUsed = dto.queriesUsed;
    if (dto.queriesLimit !== undefined) orgData.queriesLimit = dto.queriesLimit;
    if (dto.isUnlimited !== undefined) orgData.isUnlimited = dto.isUnlimited;
    if (isUnlimited) { orgData.isUnlimited = true; orgData.queriesLimit = -1; }

    const licenseType = isUnlimited ? LicenseType.UNLIMITED : LicenseType.SUBSCRIPTION;
    const creditLimit = isUnlimited ? null : (dto.queriesLimit ?? null);

    return this.prisma.$transaction(async (tx) => {
      if (
        adminId &&
        (dto.plan !== undefined || dto.queriesLimit !== undefined || dto.isUnlimited !== undefined)
      ) {
        await tx.license.updateMany({ where: { orgId, isActive: true }, data: { isActive: false } });
        await tx.license.create({
          data: {
            orgId,
            type: licenseType,
            credits: creditLimit,
            isActive: true,
            notes: `Admin panel — plan: ${dto.plan ?? 'unchanged'}`,
            issuedById: adminId,
          },
        });
      }
      // Always update Organization
      return tx.organization.update({ where: { id: orgId }, data: orgData });
    });
  }

  
  async listUsers(page: number, limit: number, orgId?: string) {
    const where: Prisma.UserWhereInput = orgId ? { orgId } : {};
    
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, email: true, name: true, role: true, 
          isActive: true, createdAt: true, orgId: true,
          organization: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, pages: Math.ceil(total / limit) };
  }

  
  async updateGlobalSettings(settings: Record<string, string>, adminId: string) {
    const updates = Object.entries(settings).map(([key, value]) =>
      this.prisma.systemSetting.upsert({
        where: { key },
        create: { key, value, updatedBy: adminId },
        update: { value, updatedBy: adminId },
      }),
    );
    return Promise.all(updates);
  }
}