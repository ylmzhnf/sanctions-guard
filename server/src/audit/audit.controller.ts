import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';

@UseGuards(JwtGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @GetUser('orgId') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const result = await this.auditService.getOrgLogs(orgId, pageNum, limitNum);

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
    const { valid, log } = await this.auditService.verifyLog(id);

    return {
      success: true,
      isValid: valid,
      log,
      message: valid
        ? 'Log integrity has been verified. The data is authentic.'
        : 'CRITICAL WARNING: Log integrity verification failed! This record may have been tampered with.',
    };
  }
}
