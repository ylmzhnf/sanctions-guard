import { Test, TestingModule } from '@nestjs/testing';
import { OsintService } from './osint.service';

global.fetch = jest.fn();

describe('OsintService', () => {
  let service: OsintService;

  beforeEach(async () => {
    process.env.SERPER_API_KEY = 'test_key_123';

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OsintService],
    }).compile();

    service = module.get<OsintService>(OsintService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return results when API calls succeed', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          news: [
            {
              title: 'News 1',
              link: 'link1',
              source: 'Source 1',
              date: 'today',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic: [
            {
              title: 'Social 1',
              link: 'https://twitter.com/user',
              snippet: '...',
            },
          ],
        }),
      });

    const result = await service.fetchResults('John Doe');

    expect(result.news).toHaveLength(1);
    expect(result.social).toHaveLength(1);
    expect(result.social[0].platform).toBe('Twitter/X');
  });

  it('should handle API failure gracefully (HTTP 500) and return empty arrays', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await service.fetchResults('Jane Doe');

    expect(result.news).toEqual([]);
    expect(result.social).toEqual([]);
  });

  it('should return empty arrays if API key is missing without calling fetch', async () => {
    delete process.env.SERPER_API_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [OsintService],
    }).compile();
    const serviceNoKey = module.get<OsintService>(OsintService);

    const result = await serviceNoKey.fetchResults('John Doe');

    expect(result.news).toEqual([]);
    expect(result.social).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
