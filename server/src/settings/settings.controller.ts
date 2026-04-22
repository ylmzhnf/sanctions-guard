import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { GetUser } from '../auth/decorator/get-user.decorator';

@UseGuards(JwtGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('config')
  @Roles(Role.ADMIN)
  async getConfig(@GetUser('orgId') orgId: string) {
    return this.settingsService.getConfig(orgId);
  }

  @Patch('config')
  @Roles(Role.ADMIN)
  async updateConfig(
    @GetUser('orgId') orgId: string,
    @Body() body: { threshold?: number; aiApiKey?: string },
  ) {
    return this.settingsService.updateConfig(orgId, body);
  }
}