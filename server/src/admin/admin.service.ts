import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSystemOverview() {
    const [stats, byRisk] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*) FROM "User") as "totalUsers",
          (SELECT COUNT(*) FROM "Organization") as "totalOrgs",
          (SELECT COUNT(*) FROM "ScreeningQuery") as "totalQueries"
      `,
      this.prisma.screeningQuery.groupBy({
        by: ['riskLevel'],
        _count: true,
      }),
    ]);

    return {
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

  async createOrganization(dto: { name: string }) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        settings: { create: {} },
      },
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
          organization: { select: { name: true } },
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