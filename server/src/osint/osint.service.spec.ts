import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OsintService } from './osint.service';
import { RedisService } from '../common/redis/redis.service';

jest.mock('axios');

const mockedAxios = axios as jest.MockedFunction<typeof axios>;
const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
};

describe('OsintService', () => {
  let service: OsintService;

  beforeEach(async () => {
    process.env.SERPER_API_KEY = 'test_key_123';

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OsintService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => process.env[key]) },
        },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<OsintService>(OsintService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return results when API calls succeed', async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: {
          news: [
            {
              title: 'News 1',
              link: 'link1',
              source: 'Source 1',
              date: 'today',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          organic: [{ title: 'Social 1', link: 'https://twitter.com/user' }],
        },
      });

    const result = await service.fetchResults(
      'John Doe',
      0.9,
      0.7,
      'test_key_123',
    );

    expect(result.news).toHaveLength(1);
    expect(result.social).toHaveLength(1);
    expect(result.social[0].platform).toBe('X / Twitter');
  });

  it('should handle API failure gracefully (HTTP 500) and return empty arrays', async () => {
    mockedAxios.mockRejectedValue(new Error('HTTP 500'));

    const result = await service.fetchResults(
      'Jane Doe',
      0.9,
      0.7,
      'test_key_123',
    );

    expect(result.news).toEqual([]);
    expect(result.social).toEqual([]);
  });

  it('should return empty arrays if API key is missing without calling fetch', async () => {
    delete process.env.SERPER_API_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OsintService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => process.env[key]) },
        },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    const serviceNoKey = module.get<OsintService>(OsintService);

    const result = await serviceNoKey.fetchResults('John Doe', 0.9, 0.7);

    expect(result.news).toEqual([]);
    expect(result.social).toEqual([]);
    expect(mockedAxios).not.toHaveBeenCalled();
  });
});
