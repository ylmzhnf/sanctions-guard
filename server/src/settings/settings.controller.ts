import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@UseGuards(JwtGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('config')
  @Roles(Role.ADMIN)
  async getConfig(@GetUser('orgId') orgId: string) {
    return this.settingsService.getConfig(orgId);
  }

  @Patch('config')
  @Roles(Role.ADMIN)
  async updateConfig(
    @GetUser('orgId') orgId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateConfig(orgId, dto);
  }
}
