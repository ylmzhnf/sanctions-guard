import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ScreenQueryDto, SearchSanctionDto } from './dto/screen-query.dto';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import type { User } from '@prisma/client';
import { AuditInterceptor } from 'src/common/interceptors/audit.interceptor';

@UseGuards(JwtGuard)
@Controller('screening')
export class ScreeningController {
  constructor(private readonly screeningService: ScreeningService) {}

  @Get('search')
  @UseGuards(PlanGuard) 
  @UseInterceptors(AuditInterceptor)
  async search(@Query() query: ScreenQueryDto, @GetUser() user: any) {
    const result = await this.screeningService.screen(
      query,
      user.id,
      user.orgId,
    );

    if (!result.matches || result.matches.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'No match found',
        data: [],
        queryId: result.queryId,
        riskLevel: result.riskLevel,
      };
    }

    const formattedResults = result.matches.map((item) => ({
      ...item,
      score:
        typeof item.score === 'number'
          ? Number(item.score.toFixed(2))
          : item.score,
    }));

    return {
      success: true,
      count: formattedResults.length,
      data: formattedResults,
      queryId: result.queryId,
      riskLevel: result.riskLevel,
      aiExplanation: result.aiExplanation,
    };
  }
}
