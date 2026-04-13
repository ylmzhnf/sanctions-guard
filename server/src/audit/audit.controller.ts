import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtGuard)
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  async getLogs(@Req() req: any) {
    const logs = await this.auditService.getAuditLogs(req.user.orgId);
    return {
      success: true,
      data: logs,
    };
  }
}
