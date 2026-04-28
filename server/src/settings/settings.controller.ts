import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('config')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Organizasyon ayarlarını getir' })
  @ApiResponse({ status: 200, description: 'Ayarlar başarıyla getirildi.' })
  async getConfig(@GetUser('orgId') orgId: string) {
    return this.settingsService.getConfig(orgId);
  }

  @Patch('config')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Organizasyon ayarlarını güncelle' })
  @ApiResponse({ status: 200, description: 'Ayarlar güncellendi.' })
  async updateConfig(
    @GetUser('orgId') orgId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateConfig(orgId, dto);
  }
}