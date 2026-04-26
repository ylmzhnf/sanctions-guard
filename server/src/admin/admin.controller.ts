import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role, Plan } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('organizations')
  async listOrganizations(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.adminService.listOrganizations(page, limit);
  }

  @Patch('organizations/:id/license')
  async updateLicense(
    @Param('id') id: string,
    @Body() data: { plan?: Plan; queriesLimit?: number; isUnlimited?: boolean },
  ) {
    return this.adminService.updateOrganizationLicense(id, data);
  }
}
