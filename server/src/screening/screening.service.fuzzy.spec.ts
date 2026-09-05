import { Test, TestingModule } from '@nestjs/testing';
import { ScreeningService } from './screening.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { AiExplainerService } from '../ai-explainer/ai-explainer.service';
import { AuditService } from '../audit/audit.service';
import { OsintService } from '../osint/osint.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('ScreeningService - Fuzzy Matching (Critical Unit Tests)', () => {
  let service: ScreeningService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockAi: any;
  let mockAudit: any;
  let mockOsint: any;
  let mockQueue: any;

  beforeAll(async () => {
    mockPrisma = {
      organization: {
        findUniqueOrThrow: jest.fn(),
      },
      $queryRaw: jest.fn(),
      screeningQuery: {
        create: jest.fn(),
      },
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockAi = {
      explain: jest.fn(),
    };

    mockAudit = {
      log: jest.fn(),
    };

    mockOsint = {
      fetchResults: jest.fn().mockResolvedValue({}),
    };

    mockQueue = {
      addBulk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AiExplainerService, useValue: mockAi },
        { provide: AuditService, useValue: mockAudit },
        { provide: OsintService, useValue: mockOsint },
        { provide: NotificationsService, useValue: { notify: jest.fn() } },
        { provide: getQueueToken('bulk-screening-queue'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ScreeningService>(ScreeningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Test 1: Exact Match Detection', () => {
    it('should score exact match at 100%', () => {
      const score = service.calculateSimilarity(
        'Roman Abramovich',
        'Roman Abramovich',
      );
      expect(score).toBe(100);
    });

    it('should score exact match (case-insensitive) at 100%', () => {
      const score = service.calculateSimilarity(
        'ROMAN ABRAMOVICH',
        'roman abramovich',
      );
      expect(score).toBe(100);
    });

    it('should score exact match with extra whitespace at 100%', () => {
      const score = service.calculateSimilarity(
        '  Roman  Abramovich  ',
        'Roman Abramovich',
      );
      expect(score).toBe(100);
    });

    it('should score entity names with special characters', () => {
      const score = service.calculateSimilarity(
        'Oleg Deripaska (LLC RUSAL)',
        'Oleg Deripaska (LLC RUSAL)',
      );
      expect(score).toBe(100);
    });
  });

  describe('Test 2: Token-Based Matching (MVP Feature)', () => {
    it('should retain a meaningful score when query tokens appear in target name', () => {
      const score = service.calculateSimilarity(
        'Vladimir Putin',
        'Vladimir Vladimirovich Putin',
      );
      expect(score).toBeGreaterThanOrEqual(60);
    });

    it('should retain partial credit for company aliases', () => {
      const score = service.calculateSimilarity(
        'UC Rusal',
        'United Company RUSAL PLC',
      );
      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('should score appropriately when only partial tokens match', () => {
      const score = service.calculateSimilarity(
        'Vladimir Putin Extra',
        'Vladimir Vladimirovich Putin',
      );
      expect(score).toBeLessThan(95);
    });

    it('should handle single-token queries', () => {
      const score = service.calculateSimilarity('Rusal', 'UC RUSAL PLC');
      expect(score).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Test 3: Levenshtein Distance with Risk Scoring', () => {
    it('should score minor typo as HIGH risk', () => {
      const score = service.calculateSimilarity('Viktor Bot', 'Viktor Bout');
      expect(score).toBeGreaterThanOrEqual(75);
    });

    it('should score single-character difference appropriately', () => {
      const score = service.calculateSimilarity(
        'Roman Abramovitch',
        'Roman Abramovich',
      );
      expect(score).toBeGreaterThanOrEqual(75);
    });

    it('should score substring match with high similarity', () => {
      const score = service.calculateSimilarity(
        'Abramovich',
        'Roman Abramovich',
      );
      expect(score).toBeGreaterThanOrEqual(50);
    });

    it('should return LOW score for completely different strings', () => {
      const score = service.calculateSimilarity('John Smith', 'Viktor Bout');
      expect(score).toBeLessThan(50);
    });

    it('should return 0 for empty strings', () => {
      const score = service.calculateSimilarity('', 'Viktor Bout');
      expect(score).toBe(0);
    });
  });

  describe('Test 4: Real-World Compliance Scenarios', () => {
    it('should correctly match OFAC SDN List: Roman Abramovich variations', () => {
      const variations = [
        'Roman Abramovich',
        'ROMAN ARKADYEVICH ABRAMOVICH',
        'roman-abramovich',
        'Abramovich, Roman',
      ];

      variations.forEach((variant) => {
        const score = service.calculateSimilarity('Roman Abramovich', variant);
        expect(score).toBeGreaterThanOrEqual(60);
      });
    });

    it('should match EU Consolidated List: UC RUSAL company', () => {
      const dbNames = [
        'UNITED COMPANY RUSAL PLC',
        'UC RUSAL',
        'Rusal',
        'UC Rusal PLC',
      ];

      dbNames.forEach((dbName) => {
        const score = service.calculateSimilarity('UC Rusal', dbName);
        expect(score).toBeGreaterThanOrEqual(30);
      });
    });

    it('should distinguish between similar but different entities', () => {
      const scoreAlexei = service.calculateSimilarity(
        'Alexei Navalny',
        'Vladimir Putin',
      );
      const scoreExact = service.calculateSimilarity(
        'Alexei Navalny',
        'Alexei Navalny',
      );

      expect(scoreExact).toBeGreaterThan(scoreAlexei * 1.5);
    });
  });
});
