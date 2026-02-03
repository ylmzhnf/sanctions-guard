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
    console.log('Screening search result:', result);

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
