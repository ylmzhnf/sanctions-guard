import { Test, TestingModule } from '@nestjs/testing';
import { ScreeningService } from './screening.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ScreeningService', () => {
  let service: ScreeningService;
  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ScreeningService, { provide: PrismaService, useValue: {} }],
    }).compile();
    service = moduleRef.get(ScreeningService);
  });
  describe('calculateSimilarity', () => {
    it('should return 100 for identical strings', () => {
      const result = service.calculateSimilarity('John Doe', 'John Doe');
      expect(result).toBe(100);
    });
    it('should be case-insensitive', () => {
      const result = service.calculateSimilarity('JOHN DOE', 'john doe');
      expect(result).toBe(100);
    });
    it('should return 0 if one string is empty', () => {
      const result = service.calculateSimilarity('', 'John');
      expect(result).toBe(0);
    });
    it('should return a high score for similar names', () => {
      const result = service.calculateSimilarity('Mohamed Ali', 'Muhammad Ali');
      expect(result).toBeGreaterThan(70);
    });
    it('should return a low score for every different names', () => {
      const result = service.calculateSimilarity('John Doe', 'Apple Orange');
      expect(result).toBeLessThan(30);
    });
    it('should always return a value between 0 and 100', () => {
      const result = service.calculateSimilarity('test', 'testing');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });
});
