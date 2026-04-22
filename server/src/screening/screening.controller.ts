import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ScreenQueryDto } from './dto/screen-query.dto';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { PlanGuard } from 'src/auth/guard/plan.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { AuditInterceptor } from 'src/common/interceptors/audit.interceptor';
import { ScreeningService } from './screening.service';

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
        typeof item.score === 'number' ? Math.round(item.score) : item.score,
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
