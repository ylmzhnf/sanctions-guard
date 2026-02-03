import { Controller, Get } from '@nestjs/common';

@Controller('screening')
export class ScreeningController {
  @Get()
  searchSanctionedNames() {}
}
