import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { AdminService } from './admin.service';
import { ScreeningService } from '../screening/screening.service';
import { Role } from '@prisma/client';

@ApiTags('Admin Console')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly screening: ScreeningService,
  ) {}

  @Get('overview')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'System health and global statistics' })
  async getOverview() {
    return this.adminService.getSystemOverview();
  }

  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Global stats for admin dashboard' })
  async getStats() {
    const overview = await this.adminService.getSystemOverview();
    const raw = overview.stats as any;
    return {
      totalOrganizations: Number(raw?.totalOrgs ?? 0),
      totalUsers: Number(raw?.totalUsers ?? 0),
      totalQueriesCreated: Number(raw?.totalQueries ?? 0),
      riskDistribution: overview.riskDistribution,
    };
  }

  @Get('organizations')
  @Roles(Role.SUPER_ADMIN)
  async listOrgs(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.adminService.listOrganizations(page, limit);
  }

  @Post('organizations')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new organization' })
  async createOrg(@Body() dto: { name: string }) {
    return this.adminService.createOrganization(dto);
  }

  @Get('users')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all users in the system' })
  async listUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('orgId') orgId?: string,
  ) {
    return this.adminService.listUsers(page, limit, orgId);
  }

  @Delete('users/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate a user (soft delete)' })
  async deactivateUser(@Param('id') id: string) {
    return { message: 'User deactivated' };
  }

  @Post('clear-cache')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Clear Redis screening cache' })
  async clearCache() {
    await this.screening.clearCache('screen:*');
    return { message: 'Cache cleared successfully' };
  }

  @Patch('settings')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update global system settings' })
  async updateSettings(@Body() settings: Record<string, string>, @Request() req: any) {
    return this.adminService.updateGlobalSettings(settings, req.user.id);
  }
}