import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get organization audit logs with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by action, user, or query name' })
  async getLogs(
    @GetUser('orgId') orgId: string,
    
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    const result = await this.auditService.getOrgLogs(orgId, page, limit, search);

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
  @ApiOperation({ summary: 'Verify cryptographic integrity of a specific audit log' })
  @ApiParam({ name: 'id', description: 'The UUID of the audit log' })
  async verify(@Param('id') id: string) {
    const { valid, log } = await this.auditService.verifyLog(id);

    return {
      success: true,
      isValid: valid,
      data: log, 
      message: valid
        ? 'Log integrity verified. The data is authentic and unaltered.'
        : 'CRITICAL WARNING: Log integrity verification failed! This record may have been tampered with.',
    };
  }
}