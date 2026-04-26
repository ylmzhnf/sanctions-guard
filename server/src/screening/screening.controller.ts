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
import type { Response } from 'express';
import { RiskLevel } from '@prisma/client';

import { ScreenQueryDto } from './dto/screen-query.dto';
import { BulkScreenDto } from './dto/bulk-screen.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { PlanGuard } from '../auth/guard/plan.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ScreeningService } from './screening.service';
import { ReportsService } from './reports.service';

interface RequestUser {
  id: string;
  orgId: string;
}

@UseGuards(JwtGuard)
@Controller('screening')
export class ScreeningController {
  constructor(
    private readonly screeningService: ScreeningService,
    private readonly reportsService: ReportsService,
  ) {}

  @Post('screen')
  @UseGuards(PlanGuard)
  @UseInterceptors(AuditInterceptor)
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
      score:
        typeof item.score === 'number' ? Math.round(item.score) : item.score,
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
  async bulkScreen(@Body() dto: BulkScreenDto, @GetUser() user: RequestUser) {
    return this.screeningService.bulkScreen(dto, user.id, user.orgId);
  }

  @Get('history')
  async history(
    @GetUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('riskLevel') riskLevel?: RiskLevel,
    @Query('queryName') queryName?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    return this.screeningService.getHistory(
      user.orgId,
      parsedPage,
      parsedLimit,
      { riskLevel, queryName },
    );
  }

  @Get('download-report/:id')
  async downloadReport(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.reportsService.generateScreeningReport(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=screening-report-${id}.pdf`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }
}
