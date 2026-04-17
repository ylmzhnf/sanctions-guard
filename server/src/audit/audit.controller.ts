import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtGuard)
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 50;

    const result = await this.auditService.getAuditLogs(
      req.user.orgId,
      pageNum,
      limitNum,
    );
    return {
      success: true,
      data: result.logs,
      meta: {
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    };
  }

  @Get('verify/:id')
  async verify(@Param('id') id: string) {
    const verification = await this.auditService.verifyLog(id);

    return {
      success: true,
      isValid: verification.valid,
      log: verification.log,
      message: verification.valid
        ? 'Log integrity has been verified. The data is valid.'
        : 'WARNING: Log integrity verification failed! The data may have been tampered with or corrupted.',
    };
  }
}
