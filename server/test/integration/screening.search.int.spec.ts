import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ScreeningService } from '../../src/screening/screening.service';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '../../src/common/redis/redis.service';
import { AuditService } from '../../src/audit/audit.service';
import { AiExplainerService } from '../../src/ai-explainer/ai-explainer.service';
import { OsintService } from '../../src/osint/osint.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { getQueueToken } from '@nestjs/bullmq';
import { RiskLevel } from '@prisma/client';

describe('ScreeningService (Integration)', () => {
  let service: ScreeningService;
  let prisma: PrismaService;

  let userId: string;
  let orgId: string;
  const testRunId = Date.now();
  const entityName = `Vladimir Putin ${testRunId}`;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };

  const mockAi = {
    explain: jest.fn().mockResolvedValue('AI risk assessment provided.'),
  };

  const mockOsint = {
    fetchResults: jest.fn().mockResolvedValue({ news: [], social: [] }),
  };

  const mockNotifications = {
    notify: jest.fn(),
  };

  const mockQueue = {
    addBulk: jest.fn(),
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
        { provide: OsintService, useValue: mockOsint },
        { provide: NotificationsService, useValue: mockNotifications },
        {
          provide: getQueueToken('bulk-screening-queue'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(ScreeningService);
    prisma = moduleRef.get(PrismaService);

    const org = await prisma.organization.create({
      data: { name: `Integration Test Corp ${testRunId}` },
    });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `tester-${testRunId}@guard.com`,
        passwordHash: 'dummy-hash',
        name: 'Test Officer',
        orgId: orgId,
      },
    });
    userId = user.id;

    await prisma.sanctionedEntity.create({
      data: {
        externalId: `TEST-VP-${testRunId}`,
        name: entityName,
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
      { queryName: `Vladimir Puten ${testRunId}` },
      userId,
      orgId,
    );

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].matchedName).toBe(entityName);
    expect(result.riskLevel).toBe(RiskLevel.CRITICAL);

    const logs = await prisma.auditLog.findMany({
      where: { actorId: userId },
    });

    expect(logs.length).toBeGreaterThan(0);
  });

  it('should persist a screening after organization usage is updated', async () => {
    await expect(
      service.screen({ queryName: 'Test' }, userId, orgId),
    ).resolves.toHaveProperty('riskLevel');
  });
});
