import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LicensingService, LicenseStatus } from './licensing.service';
import { JwtGuard } from '../auth/guard/jwt.guard';

@ApiTags('Licensing & Quota')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('licensing')
export class LicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Mevcut kurumun lisans ve kullanım durumunu getirir',
    description:
      'Frontend dashboard ekranlarındaki "Kalan Kredi" ve "Plan Bilgisi" için kullanılır.',
  })
  async status(@Request() req: any): Promise<LicenseStatus> {
    return this.licensingService.getLicenseStatus(req.user.orgId);
  }
}
