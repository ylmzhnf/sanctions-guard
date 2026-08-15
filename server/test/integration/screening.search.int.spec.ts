import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ScreeningService } from '../../src/screening/screening.service';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '../../src/common/redis/redis.service';
import { AuditService } from '../../src/audit/audit.service';
import { AiExplainerService } from '../../src/ai-explainer/ai-explainer.service';
import { RiskLevel } from '@prisma/client';

describe('ScreeningService (Integration)', () => {
  let service: ScreeningService;
  let prisma: PrismaService;

  let userId: string;
  let orgId: string;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };

  const mockAi = {
    explain: jest.fn().mockResolvedValue('AI risk assessment provided.'),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
      ],
      providers: [
        ScreeningService,
        PrismaService,
        AuditService,
        { provide: RedisService, useValue: mockRedis },
        { provide: AiExplainerService, useValue: mockAi },
      ],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(ScreeningService);
    prisma = moduleRef.get(PrismaService);

    await prisma.auditLog.deleteMany();
    await prisma.screeningMatch.deleteMany();
    await prisma.screeningQuery.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.sanctionedEntity.deleteMany();

    const org = await prisma.organization.create({
      data: { name: 'Integration Test Corp', plan: 'BUSINESS' },
    });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `tester-${Date.now()}@guard.com`,
        passwordHash: 'dummy-hash',
        name: 'Test Officer',
        orgId: orgId,
      },
    });
    userId = user.id;

    await prisma.sanctionedEntity.create({
      data: {
        externalId: 'TEST-VP-1',
        name: 'Vladimir Putin',
        aliases: ['Vova', 'Puten'],
        entityType: 'INDIVIDUAL',
        listSource: 'OFAC',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should perform fuzzy match and create a secure audit log', async () => {
    const result = await service.screen(
      { queryName: 'Vladimir Puten' },
      userId,
      orgId,
    );

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].matchedName).toBe('Vladimir Putin');
    expect(result.riskLevel).toBe(RiskLevel.HIGH);

    const logs = await prisma.auditLog.findMany({
      where: { userId },
    });

    expect(logs.length).toBe(0);
  });

  it('should respect query limits', async () => {
    await prisma.organization.update({
      where: { id: orgId },
      data: { queriesUsed: 1000000, plan: 'FREE' },
    });

    await expect(
      service.screen({ queryName: 'Test' }, userId, orgId),
    ).rejects.toThrow('Query limit reached');
  });
});
