import { Test, TestingModule } from '@nestjs/testing';
import { ScreeningService } from './screening.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { AiExplainerService } from '../ai-explainer/ai-explainer.service';
import { AuditService } from '../audit/audit.service';
import { RiskLevel, ScreeningStatus } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('ScreeningService', () => {
  let service: ScreeningService;

  const MOCK_CANDIDATES = [
    {
      id: 'ent-1',
      name: 'Vladimir Putin',
      aliases: ['Vova', 'Puten'],
      entityType: 'INDIVIDUAL',
      listSource: 'OFAC',
    },
  ];

  const mockPrisma = {
    organization: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    screeningQuery: {
      create: jest.fn(),
    },
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AiExplainerService, useValue: mockAi },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ScreeningService>(ScreeningService);
    jest.clearAllMocks(); 
  });

  describe('calculateSimilarity', () => {
    it('should return 100 for exact, case-insensitive match', () => {
      expect(service.calculateSimilarity('John Doe', 'john doe ')).toBe(100);
    });

    it('should return 0 for empty strings', () => {
      expect(service.calculateSimilarity('', 'John')).toBe(0);
    });

    it('should catch typos with high similarity', () => {
      const score = service.calculateSimilarity('Abramovich', 'Abramovitch');
      expect(score).toBeGreaterThan(85);
    });
  });

  describe('screen', () => {
    const defaultParams = { name: 'user-1', org: 'org-1' };

    beforeEach(() => {
      mockPrisma.organization.findUniqueOrThrow.mockResolvedValue({
        id: 'org-1',
        plan: 'BUSINESS',
        queriesUsed: 0,
        aiApiKey: 'key',
      });
      mockRedis.get.mockResolvedValue(null);
    });

    it('should throw ForbiddenException if plan limit is reached', async () => {
      mockPrisma.organization.findUniqueOrThrow.mockResolvedValue({
        plan: 'FREE',
        queriesUsed: 100, 
      });

      await expect(
        service.screen({ queryName: 'Test' }, 'u-1', 'o-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return cached result if exists in Redis', async () => {
      const cachedData = { queryId: 'q-cache', riskLevel: RiskLevel.CLEAR, matches: [] };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.screen({ queryName: 'Any' }, 'u-1', 'o-1');
      
      expect(result.queryId).toBe('q-cache');
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should return CRITICAL for exact match and call AI', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([MOCK_CANDIDATES[0]]);
      mockPrisma.screeningQuery.create.mockResolvedValue({ id: 'new-query-id' });
      mockAi.explain.mockResolvedValue('AI Explanation');

      const result = await service.screen({ queryName: 'Vladimir Putin' }, 'u-1', 'o-1');

      expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
      expect(mockAi.explain).toHaveBeenCalled(); 
    });

    it('should return CLEAR and NOT call AI if no matches found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]); 
      mockPrisma.screeningQuery.create.mockResolvedValue({ id: 'q-clear' });

      const result = await service.screen({ queryName: 'Clean Person' }, 'u-1', 'o-1');

      expect(result.riskLevel).toBe(RiskLevel.CLEAR);
      expect(mockAi.explain).not.toHaveBeenCalled();
    });

    it('should match via Aliases correctly', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([MOCK_CANDIDATES[0]]);
      mockPrisma.screeningQuery.create.mockResolvedValue({ id: 'q-alias' });

      const result = await service.screen({ queryName: 'Puten' }, 'u-1', 'o-1');

      expect(result.matches[0].matchedField).toBe('alias');
      expect(result.matches[0].score).toBeGreaterThan(80);
    });

    it('should persist data and increment usage within a transaction', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.screeningQuery.create.mockResolvedValue({ id: 'q-1' });

      await service.screen({ queryName: 'Test' }, 'u-1', 'o-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.screeningQuery.create).toHaveBeenCalled();
      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { queriesUsed: { increment: 1 } },
        }),
      );
    });
  });
});