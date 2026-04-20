import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SearchSanctionDto } from './dto/search-sanction.dto';
import { ScreeningService } from './screening.service';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import type { User } from '@prisma/client';
import { AuditInterceptor } from 'src/common/interceptors/audit.interceptor';

@UseGuards(JwtGuard)
@UseInterceptors(AuditInterceptor)
@Controller('screening')
export class ScreeningController {
  constructor(private readonly screeningService: ScreeningService) {}
  @Get('search')
  async search(@Query() query: SearchSanctionDto, @GetUser() user: any) {
    const { results, queryId, riskLevel } = await this.screeningService.searchSanctionedNames(
      query.queryName,
      user.id,
      user.orgId,
    );

    if (!results || results.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'No match found',
        data: [],
        queryId,
        riskLevel,
      };
    }

    const formattedResults = results.map((item) => ({
      ...item,
      score: Number(item.score.toFixed(2)),
    }));

    return {
      success: true,
      count: formattedResults.length,
      data: formattedResults,
      queryId,
      riskLevel,
    };
  }
}
