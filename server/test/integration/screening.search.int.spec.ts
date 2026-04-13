import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ScreeningService } from '../../src/screening/screening.service';
import { ConfigModule } from '@nestjs/config';

describe('ScreeningService', () => {
  let service: ScreeningService;
  let prisma: PrismaService;

  let userId: string;
  let orgId: string;
  let entityId: string;

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

    // Create Organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org',
      },
    });
    orgId = org.id;

    // Create User
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        password: 'hashed-password',
        orgId: org.id,
      },
    });
    userId = user.id;

    // Create Sanctioned Entity
    const entity = await prisma.sanctionedEntity.create({
      data: {
        externalId: 'TEST-UA-1',
        name: 'Vladimir Putin',
        listSource: 'OTHER',
        entityType: 'Individual',
        reason: 'Head of state',
        country: 'RU',
      },
    });
    entityId = entity.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { orgId } });
    await prisma.screeningMatch.deleteMany({
      where: { query: { orgId } },
    });
    await prisma.screeningQuery.deleteMany({ where: { orgId } });
    await prisma.sanctionedEntity.deleteMany({ where: { id: entityId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it('should return fuzzy match and create immutable audit log', async () => {
    const result = await service.searchSanctionedNames(
      'Vladimir Puten',
      userId,
      orgId,
    );

    expect(result.results.length).toBeGreaterThan(0);
    const bestMatch = result.results[0];

    expect(bestMatch.name).toBe('Vladimir Putin');
    expect(bestMatch.score).toBeGreaterThan(80);

    const logs = await prisma.auditLog.findMany({
      where: { userId },
    });

    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log).toBeDefined();
    expect((log.metadata as any).searchedName).toBe('Vladimir Puten');
    
    await expect(
      prisma.auditLog.update({
        where: { id: log.id },
        data: { action: 'Changed Action' },
      }),
    ).rejects.toThrow('Audit log should be immutable and not allow updates.');
  });
});
