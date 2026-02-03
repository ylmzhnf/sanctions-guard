import { Controller, Get, Query } from '@nestjs/common';
import { SearchSanctionDto } from './dto/search-sanction.dto';
import { ScreeningService } from './screening.service';

@Controller('screening')
export class ScreeningController {
  constructor(private readonly screeningService: ScreeningService) {}
  @Get('search')
  async search(@Query() query: SearchSanctionDto) {
    const result = await this.screeningService.searchSanctionedNames(
      query.queryName,
      query.userId,
    );

    if (!result || result.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'No match found',
        data: [],
      };
    }
    const formattedResult = result.map((item) => ({
      ...item,
      score: Number(item.score.toFixed(2)),
    }));

    return {
      success: true,
      count: formattedResult.length,
      data: formattedResult,
    };
  }
}
