import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [orgCount, userCount, queryCount, usage] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.screeningQuery.count(),
      this.prisma.organization.aggregate({ _sum: { queriesUsed: true } }),
    ]);

    return {
      totalOrganizations: orgCount,
      totalUsers: userCount,
      totalQueriesCreated: queryCount,
      totalSystemUsage: usage._sum.queriesUsed || 0,
    };
  }

  async listOrganizations(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip,
        take: limit,
        include: { _count: { select: { users: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrganizationLicense(
    orgId: string,
    data: { plan?: Plan; queriesLimit?: number; isUnlimited?: boolean },
  ) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data,
    });
  }
}
