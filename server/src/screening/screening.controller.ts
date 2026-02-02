import { Controller, Get } from '@nestjs/common';

@Controller('screening')
export class ScreeningController {
  @Get()
  getScreenings(): string {
    return 'List of Screenings';
  }
}
