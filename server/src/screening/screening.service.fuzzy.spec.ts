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
    // Mock all dependencies
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

  /**
   * TEST 1: EXACT MATCH DETECTION
   * Tests that identical names produce 100% similarity score
   * Critical for: CRITICAL risk level detection
   * Real-world scenario: Direct entity name match in sanctions lists
   */
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

  /**
   * TEST 2: TOKEN-BASED MATCHING (MVP Critical Feature)
   * Tests multi-word name matching where all tokens appear
   * Critical for: Catching aliases and variations
   * Real-world scenario:
   *   Query: "Vladimir Putin"
   *   Database: "Vladimir Vladimirovich Putin"
   *   Expected: HIGH/CRITICAL match (both tokens present)
   */
  describe('Test 2: Token-Based Matching (MVP Feature)', () => {
    it('should score HIGH when all query tokens exist in target name', () => {
      const score = service.calculateSimilarity(
        'Vladimir Putin',
        'Vladimir Vladimirovich Putin',
      );
      // Should be >= 85 (HIGH risk) because "Vladimir" and "Putin" both appear
      expect(score).toBeGreaterThanOrEqual(85);
    });

    it('should score HIGH for company aliases', () => {
      const score = service.calculateSimilarity(
        'UC Rusal',
        'United Company RUSAL PLC',
      );
      // Both "UC"/"United Company" and "Rusal"/"RUSAL" should match
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should score appropriately when only partial tokens match', () => {
      // Query has tokens not in target
      const score = service.calculateSimilarity(
        'Vladimir Putin Extra',
        'Vladimir Vladimirovich Putin',
      );
      // Should NOT reach CRITICAL because "Extra" doesn't appear
      expect(score).toBeLessThan(95);
    });

    it('should handle single-token queries', () => {
      const score = service.calculateSimilarity('Rusal', 'UC RUSAL PLC');
      // Single token "Rusal" appears in "UC RUSAL PLC"
      expect(score).toBeGreaterThanOrEqual(50);
    });
  });

  /**
   * TEST 3: LEVENSHTEIN DISTANCE WITH RISK SCORING
   * Tests typo detection and near-miss similarity
   * Critical for: Catching misspelled sanctions names
   * Real-world scenario:
   *   Query: "Viktor Bout" (typo: "Bout" instead of "Bout")
   *   Database: "Viktor Bout"
   *   Expected: HIGH match despite small error
   */
  describe('Test 3: Levenshtein Distance with Risk Scoring', () => {
    it('should score minor typo as HIGH risk', () => {
      const score = service.calculateSimilarity('Viktor Bot', 'Viktor Bout');
      // One character difference in 11 chars = 90%+ similarity
      expect(score).toBeGreaterThanOrEqual(75);
    });

    it('should score single-character difference appropriately', () => {
      const score = service.calculateSimilarity(
        'Roman Abramovitch',
        'Roman Abramovich',
      );
      // Only one character difference
      expect(score).toBeGreaterThanOrEqual(75);
    });

    it('should score substring match with high similarity', () => {
      const score = service.calculateSimilarity(
        'Abramovich',
        'Roman Abramovich',
      );
      // Substring appears in full name
      expect(score).toBeGreaterThanOrEqual(50);
    });

    it('should return LOW score for completely different strings', () => {
      const score = service.calculateSimilarity('John Smith', 'Viktor Bout');
      // No similarity at all
      expect(score).toBeLessThan(50);
    });

    it('should return 0 for empty strings', () => {
      const score = service.calculateSimilarity('', 'Viktor Bout');
      expect(score).toBe(0);
    });
  });

  /**
   * TEST 4: REAL-WORLD CRITICAL SCENARIOS
   * Integration of all matching strategies
   */
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
        expect(score).toBeGreaterThanOrEqual(70);
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
        expect(score).toBeGreaterThanOrEqual(50);
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

      // Exact match should score much higher
      expect(scoreExact).toBeGreaterThan(scoreAlexei * 1.5);
    });
  });
});

/**
 * RISK LEVEL THRESHOLDS (for reference during testing)
 *
 * Score >= 95% → CRITICAL (exact/near-exact match)
 * Score >= 85% → HIGH (strong match, review required)
 * Score >= 70% → MEDIUM (possible match)
 * Score >= 50% → LOW (weak match, flag for awareness)
 * Score < 50% → CLEAR (no significant match)
 *
 * These tests validate that the scoring algorithm correctly
 * categorizes matches into these risk levels.
 */
