import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtGuard)
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  async getLogs() {
    const logs = await this.auditService.getAuditLogs();
    return {
      success: true,
      data: logs,
    };
  }
}
