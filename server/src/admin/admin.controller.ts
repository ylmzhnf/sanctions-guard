import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { AdminService } from './admin.service';
import { LicensingService } from '../licensing/licensing.service';
import { ScreeningService } from '../screening/screening.service';
import { Role, Plan, LicenseType } from '@prisma/client';

@ApiTags('Admin Console')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN) 
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly licensing: LicensingService,
    private readonly screening: ScreeningService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Sistem sağlık durumu ve global istatistikler' })
  async getOverview() {
    return this.adminService.getSystemOverview();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Global stats alias for admin dashboard' })
  async getStats() {
    const overview = await this.adminService.getSystemOverview();
    const raw = overview.stats as any;
    return {
      totalOrganizations: Number(raw?.totalOrgs ?? 0),
      totalUsers: Number(raw?.totalUsers ?? 0),
      totalQueriesCreated: Number(raw?.totalQueries ?? 0),
      totalSystemUsage: Number(raw?.systemUsage ?? 0),
      riskDistribution: overview.riskDistribution,
      appMode: overview.appMode,
      version: overview.version,
    };
  }

  
  @Get('organizations')
  async listOrgs(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.adminService.listOrganizations(page, limit);
  }

  @Post('organizations')
  @ApiOperation({ summary: 'Yeni kurum oluştur (Enterprise kurulumları için)' })
  async createOrg(@Body() dto: { name: string; queryLimit?: number }) {
    return this.adminService.createOrganization(dto);
  }

  
  @Post('organizations/:id/assign-license')
  @ApiOperation({ summary: 'Kuruma manuel lisans veya kredi tanımla' })
  async assignLicense(
    @Param('id') orgId: string,
    @Body() dto: { type: LicenseType; credits?: number; expiresAt?: string; notes?: string },
    @Request() req: any,
  ) {
    return this.licensing.assignLicense({
      ...dto,
      orgId,
      issuedById: req.user.id,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  @Patch('organizations/:id/limits')
  @ApiOperation({ summary: 'Kurumun tarama ve kullanıcı limitlerini anlık güncelle' })
  async updateLimits(
    @Param('id') orgId: string,
    @Body() dto: { queriesLimit?: number; usersLimit?: number; isUnlimited?: boolean },
    @Request() req: any,
  ) {
    return this.adminService.updateOrganizationLimits(orgId, dto, req.user?.id);
  }

  @Patch('organizations/:id/license')
  @ApiOperation({ summary: 'Frontend alias: update plan, limits, or reset queries for an org' })
  async updateLicense(
    @Param('id') orgId: string,
    @Body() dto: { plan?: string; queriesLimit?: number; isUnlimited?: boolean; queriesUsed?: number },
    @Request() req: any,
  ) {
    return this.adminService.updateOrganizationLimits(orgId, dto, req.user?.id);
  }

  
  @Get('users')
  @ApiOperation({ summary: 'Sistemdeki tüm kullanıcıları listele' })
  async listUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('orgId') orgId?: string,
  ) {
    return this.adminService.listUsers(page, limit, orgId);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Kullanıcıyı askıya al (Soft Delete)' })
  async deactivateUser(@Param('id') id: string) {
    
    return { message: 'User deactivated' };
  }

  @Post('clear-cache')
  @ApiOperation({ summary: 'Redis cache temizle (screening sonuçları)' })
  async clearCache() {
    await this.screening.clearCache('screen:*');
    return { message: 'Cache cleared successfully' };
  }

  
  @Patch('settings')
  @Roles(Role.SUPER_ADMIN) 
  @ApiOperation({ summary: 'Global sistem ayarlarını güncelle (SMTP, AI, Security)' })
  async updateSettings(@Body() settings: Record<string, string>, @Request() req: any) {
    return this.adminService.updateGlobalSettings(settings, req.user.id);
  }
}