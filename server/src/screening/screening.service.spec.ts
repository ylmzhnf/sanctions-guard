import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { RiskLevel, ScreeningStatus } from '@prisma/client';

import { ScreeningService } from './screening.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { AiExplainerService } from '../ai-explainer/ai-explainer.service';
import { AuditService } from '../audit/audit.service';
import { OsintService } from '../osint/osint.service';
import { NotificationsService } from '../notifications/notifications.service';

const MOCK_CANDIDATES = [
  {
    id: 'entity-1',
    name: 'Roman Abramovich',
    searchName: 'Roman Abramovich',
    field: 'name',
    aliases: ['Roman Arkadyevich Abramovich', 'Vova'],
    entityType: 'INDIVIDUAL',
    listSource: 'OFAC_SDN',
    country: 'Russia',
    programs: ['RUSSIA-EO14024'],
  },
  {
    id: 'entity-2',
    name: 'United Company RUSAL',
    searchName: 'UC Rusal',
    field: 'alias',
    aliases: ['UC Rusal', 'Rusal PLC'],
    entityType: 'ENTITY',
    listSource: 'EU_CONSOLIDATED',
    country: 'Russia',
    programs: ['UKRAINE-EO13661'],
  },
];

const mockPrisma = {
  organization: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  screeningQuery: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(async (callback) => callback(mockPrisma)),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockAi = {
  explain: jest.fn(),
};

const mockAudit = {
  log: jest.fn(),
};

const mockOsint = {
  fetchResults: jest.fn(),
};

const mockQueue = {
  addBulk: jest.fn(),
};

const mockNotifications = {
  notify: jest.fn(),
};

describe('ScreeningService', () => {
  let service: ScreeningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AiExplainerService, useValue: mockAi },
        { provide: AuditService, useValue: mockAudit },
        { provide: OsintService, useValue: mockOsint },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: getQueueToken('bulk-screening-queue'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ScreeningService>(ScreeningService);
    jest.clearAllMocks();
  });

  describe('calculateSimilarity (Levenshtein Distance)', () => {
    it('should return 100 for exact, case-insensitive matches with trailing spaces', () => {
      expect(service.calculateSimilarity('John Doe', 'john doe ')).toBe(100);
    });

    it('should return 0 for empty strings', () => {
      expect(service.calculateSimilarity('', 'John')).toBe(0);
    });

    it('should catch typos and transliterations with high similarity', () => {
      const score = service.calculateSimilarity('Abramovich', 'Abramovitch');
      expect(score).toBeGreaterThan(85);
    });
  });

  describe('screen (Single Entity)', () => {
    beforeEach(() => {
      mockPrisma.organization.findUniqueOrThrow.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        settings: { aiProvider: 'OPENAI', aiApiKey: 'dummy-key' },
      });
      mockRedis.get.mockResolvedValue(null);
    });

    it('should return cached result immediately and skip DB/AI if found in Redis', async () => {
      const cachedData = { riskLevel: RiskLevel.CLEAR, matches: [] };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.screen(
        { queryName: 'Cached Entity' },
        'u-1',
        'o-1',
      );

      expect(result.riskLevel).toBe(RiskLevel.CLEAR);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
      expect(mockAi.explain).not.toHaveBeenCalled();
    });

    it('should return CRITICAL for exact match and call AI/OSINT', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([MOCK_CANDIDATES[0]]);
      mockPrisma.screeningQuery.create.mockResolvedValue({ id: 'query-1' });
      mockAi.explain.mockResolvedValue('Mock AI Analysis');
      mockOsint.fetchResults.mockResolvedValue({ news: [] });

      const result = await service.screen(
        { queryName: 'Roman Abramovich' },
        'u-1',
        'o-1',
      );

      expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
      expect(result.matches[0].matchedField).toBe('name');
      expect(mockAi.explain).toHaveBeenCalled();
      expect(mockOsint.fetchResults).toHaveBeenCalled();
    });

    it('should catch company alias (UC Rusal) correctly', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([MOCK_CANDIDATES[1]]);
      mockPrisma.screeningQuery.create.mockResolvedValue({ id: 'query-2' });

      const result = await service.screen(
        { queryName: 'UC Rusal' },
        'u-1',
        'o-1',
      );

      expect(['MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.riskLevel);
      expect(result.matches[0].matchedField).toBe('alias');
      expect(result.matches[0].matchedName).toBe('UC Rusal');
    });

    it('should persist the result and write an audit log', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.screeningQuery.create.mockResolvedValue({
        id: 'query-3',
        matches: [],
      });

      await service.screen({ queryName: 'Clean Person' }, 'u-1', 'o-1');

      expect(mockPrisma.screeningQuery.create).toHaveBeenCalled();

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCREENING_PERFORMED',
          actorId: 'u-1',
          orgId: 'o-1',
        }),
      );
    });
  });

  describe('bulkScreen (Queue Integration)', () => {
    it('should add items to BullMQ queue and return 202 Accepted logic', async () => {
      mockPrisma.organization.findUniqueOrThrow.mockResolvedValue({
        plan: 'ENTERPRISE',
      });
      mockQueue.addBulk.mockResolvedValue(true);

      const dto = { names: ['Name 1', 'Name 2'] };
      const result = await service.bulkScreen(dto, 'u-1', 'o-1');

      expect(mockQueue.addBulk).toHaveBeenCalled();
      expect(mockQueue.addBulk.mock.calls[0][0]).toHaveLength(2);
      expect(result.totalQueued).toBe(2);
      expect(result.message).toContain('Bulk screening queued');
    });
  });
});
