import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ScreeningService } from '../../src/screening/screening.service';
import { ConfigModule } from '@nestjs/config';

describe('ScreeningService', () => {
  let service: ScreeningService;
  let prisma: PrismaService;

  let userId: number;
  let sanctionId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
      ],
      providers: [ScreeningService, PrismaService],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(ScreeningService);
    prisma = moduleRef.get(PrismaService);

    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        password: 'hashed-password',
      },
    });
    userId = user.id;

    const sanction = await prisma.sanctionList.create({
      data: {
        fullName: 'Vladimir Putin',
        source: 'OpenSanctions-TEST',
        reason: 'Head of state',
        country: 'RU',
      },
    });
    sanctionId = sanction.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.sanctionList.deleteMany({ where: { id: sanctionId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });
  it('should return fuzzy match and create immutable audit log', async () => {
    const result = await service.searchSanctionedNames(
      'Vladimir Puten',
      userId,
    );

    expect(result.length).toBeGreaterThan(0);
    const bestMatch = result[0];

    expect(bestMatch.fullName).toBe('Vladimir Putin');
    expect(bestMatch.score).toBeGreaterThan(0.8);

    const logs = await prisma.auditLog.findMany({
      where: { userId },
    });

    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log).toBeDefined();
    expect(log.queriedName).toBe('Vladimir Puten');
    expect(log.matchedName).toBe('Vladimir Putin');
    expect(log.similarityScore).toBeGreaterThan(0.8);
    expect(log.sanctionId).toBe(sanctionId);

    await expect(
      prisma.auditLog.update({
        where: { id: log.id },
        data: { queriedName: 'Changed Name' },
      }),
    ).rejects.toThrow('Audit log should be immutable and not allow updates.');
  });
});
