import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getJson } from 'serpapi';
import { RedisService } from '../common/redis/redis.service';

export interface OsintResult {
  news: Array<{ title: string; link: string; source: string; date: string }>;
  social: Array<{ title: string; link: string; platform: string }>;
}

@Injectable()
export class OsintService {
  private readonly logger = new Logger(OsintService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async fetchResults(
    name: string,
    score: number,
    threshold: number = 0.7,
    osintApiKey?: string,
  ): Promise<OsintResult> {
    if (score < threshold) {
      return { news: [], social: [] };
    }

    const apiKey = osintApiKey || this.configService.get<string>('SERPAPI_KEY');
    
    if (!apiKey || apiKey === 'test' || apiKey.trim() === '') {
      this.logger.warn(`SerpApi Key missing or set to test. Using MOCK OSINT data for: ${name}`);
      return this.getMockData(name);
    }

    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cacheKey = `osint_cache:${safeName}`;

    try {
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) return JSON.parse(cachedData);
    } catch (err: any) {
      this.logger.warn(`Redis cache read failed for OSINT: ${err.message}`);
    }

    try {
      this.logger.log(`Starting deep OSINT search for: ${name}`);

      const [newsResults, socialResults] = await Promise.allSettled([
        this.searchNews(name, apiKey),
        this.searchSocial(name, apiKey),
      ]);

      const finalResult: OsintResult = {
        news: newsResults.status === 'fulfilled' ? newsResults.value : [],
        social: socialResults.status === 'fulfilled' ? socialResults.value : [],
      };

      if (finalResult.news.length > 0 || finalResult.social.length > 0) {
        await this.redis.set(cacheKey, JSON.stringify(finalResult), 86400);
      }

      return finalResult;
    } catch (err: any) {
      this.logger.error(`Global OSINT failure for ${name}: ${err.message}`);
      return this.getMockData(name);
    }
  }

  private async runSearch(params: any): Promise<any> {
    try {
      const response = await getJson(params);
      if (response?.error) {
        throw new Error(`SerpApi Error: ${response.error}`);
      }
      return response;
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : err.message || JSON.stringify(err);
      throw new Error(errorMessage);
    }
  }

  private async searchNews(query: string, apiKey: string) {
    try {
      const response = await this.runSearch({
        engine: 'google_news',
        q: query,
        api_key: apiKey,
        gl: 'us',
      });

      return (response?.news_results || []).slice(0, 5).map((item: any) => ({
        title: item.title,
        link: item.link,
        source: item.source?.name || 'Unknown',
        date: item.date || 'Recent',
      }));
    } catch (err: any) {
      this.logger.warn(`News search failed (Falling back to empty/mock): ${err.message}`);
      throw err;
    }
  }

  private async searchSocial(query: string, apiKey: string) {
    try {
      const socialQuery = `"${query}" (site:twitter.com OR site:x.com OR site:linkedin.com OR site:facebook.com OR site:instagram.com)`;

      const response = await this.runSearch({
        engine: 'google',
        q: socialQuery,
        api_key: apiKey,
        num: 10,
      });

      return (response?.organic_results || []).slice(0, 5).map((item: any) => ({
        title: item.title,
        link: item.link,
        platform: this.identifyPlatform(item.link),
      }));
    } catch (err: any) {
      this.logger.warn(`Social search failed (Falling back to empty/mock): ${err.message}`);
      throw err;
    }
  }

  private identifyPlatform(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('linkedin.com')) return 'LinkedIn';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'X / Twitter';
    if (lowerUrl.includes('facebook.com')) return 'Facebook';
    if (lowerUrl.includes('instagram.com')) return 'Instagram';
    if (lowerUrl.includes('youtube.com')) return 'YouTube';
    return 'Web Source';
  }

  private getMockData(name: string): OsintResult {
    return {
      news: [
        {
          title: `[TEST DATA] Global sanctions review mentions ${name}`,
          link: 'https://example.com/news/1',
          source: 'Compliance Weekly',
          date: new Date().toLocaleDateString(),
        },
        {
          title: `[TEST DATA] Regulatory shifts impacting ${name} operations`,
          link: 'https://example.com/news/2',
          source: 'RegTech Insider',
          date: '2 days ago',
        }
      ],
      social: [
        {
          title: `[TEST DATA] LinkedIn Profile for ${name}`,
          link: 'https://linkedin.com/in/sample',
          platform: 'LinkedIn',
        },
        {
          title: `[TEST DATA] Corporate updates regarding ${name}`,
          link: 'https://x.com/sample',
          platform: 'X / Twitter',
        }
      ]
    };
  }
}