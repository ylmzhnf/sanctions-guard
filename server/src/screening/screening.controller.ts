import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { RiskLevel } from '@prisma/client';

import { ScreenQueryDto, BulkScreenDto } from './dto/query-bulk-screening.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { ScreeningService } from './screening.service';
import { ReportsService } from './reports.service';

interface RequestUser {
  id: string;
  orgId: string;
}

@ApiTags('Screening')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('screening')
export class ScreeningController {
  constructor(
    private readonly screeningService: ScreeningService,
    private readonly reportsService: ReportsService,
  ) {}

  @Post('screen')
  @UseInterceptors(AuditInterceptor) 
  @ApiOperation({ summary: 'Tekil bir kişi veya kurumu yaptırım listelerinde tarar' })
  @ApiBody({ schema: { example: { queryName: 'Viktor Bout', entityType: 'INDIVIDUAL' } } })
  async screen(@Body() dto: ScreenQueryDto, @GetUser() user: RequestUser) {
    
    const result = await this.screeningService.screen(dto, user.id, user.orgId);

    if (!result.matches || result.matches.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'No match found',
        data: [],
        queryId: result.query?.id,
        riskLevel: result.riskLevel,
        osintResults: result.osintResults,
      };
    }

    const formattedResults = result.matches.map((item) => ({
      ...item,
      score: item.score / 100,
    }));

    return {
      success: true,
      count: formattedResults.length,
      data: formattedResults,
      queryId: result.query?.id,
      riskLevel: result.riskLevel,
      aiExplanation: result.aiExplanation,
      osintResults: result.osintResults,
    };
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Toplu tarama işlemini arka plan kuyruğuna (BullMQ) ekler' })
  async bulkScreen(@Body() dto: BulkScreenDto, @GetUser() user: RequestUser) {
    return this.screeningService.bulkScreen(dto, user.id, user.orgId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Kurumun geçmiş tarama sorgularını getirir' })
  async history(
    @GetUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('riskLevel') riskLevel?: RiskLevel,
    @Query('queryName') queryName?: string,
  ) {
    return this.screeningService.getHistory(
      user.orgId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      { riskLevel, queryName },
    );
  }

  @Get('download-report/:id')
  @ApiOperation({ summary: 'Tarama sonucunu PDF olarak indirir' })
  async downloadReport(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.reportsService.generateScreeningReport(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=sanctions-report-${id}.pdf`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }
}