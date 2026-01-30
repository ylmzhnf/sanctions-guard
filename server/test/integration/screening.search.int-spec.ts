import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScreeningService } from 'src/screening/screening.service';

describe('ScreeningService', () => {
  let service: ScreeningService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ScreeningService, PrismaService],
    }).compile();

    service = moduleRef.get(ScreeningService);
    prisma = moduleRef.get(PrismaService);
  });
});
