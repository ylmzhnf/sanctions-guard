import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { SanctionsSyncService } from './sanctions-sync.service';

@Controller('admin/sanctions-sync')
@UseGuards(JwtGuard)
export class SanctionSyncController {
  constructor(
    private syncService: SanctionsSyncService,
    private prisma: PrismaService,
  ) {}

  @Post('trigger')
  async triggerSync() {
    this.syncService.syncAll().catch(console.error);
    return { message: 'Sync started in background' };
  }

  @Get('logs')
  async getSyncLogs() {
    return this.prisma.listSyncLog.findMany({
      orderBy: { syncedAt: 'desc' },
      take: 20,
    });
  }

  @Get('status')
  async getSyncStatus() {
    const [total, active, bySource] = await Promise.all([
      this.prisma.sanctionedEntity.count(),
      this.prisma.sanctionedEntity.count({ where: { isActive: true } }),
      this.prisma.sanctionedEntity.groupBy({
        by: ['listSource'],
        _count: true,
        where: { isActive: true },
      }),
    ]);
    return { total, active, bySource };
  }
}
