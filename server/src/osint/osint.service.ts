import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
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

    if (!osintApiKey || osintApiKey.trim() === '') {
      this.logger.warn(
        `OSINT API key is missing or empty. Skipping OSINT search for: ${name}`,
      );
      return { news: [], social: [] };
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
        this.searchNews(name, osintApiKey),
        this.searchSocial(name, osintApiKey),
      ]);

      const finalResult: OsintResult = {
        news: newsResults.status === 'fulfilled' ? newsResults.value : [],
        social: socialResults.status === 'fulfilled' ? socialResults.value : [],
      };

      if (finalResult.news.length > 0 || finalResult.social.length > 0) {
        try {
          await this.redis.set(cacheKey, JSON.stringify(finalResult), 86400);
        } catch (err: any) {
          this.logger.warn(
            `Redis cache write failed for OSINT: ${err.message}`,
          );
        }
      }

      return finalResult;
    } catch (err: any) {
      this.logger.error(`Global OSINT failure for ${name}: ${err.message}`);
      return { news: [], social: [] };
    }
  }

  private async runSearch(
    endpoint: 'search' | 'news',
    query: string,
    apiKey: string,
  ) {
    try {
      const response = await axios({
        method: 'post',
        url: `https://google.serper.dev/${endpoint}`,
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({ q: query, gl: 'us' }),
      });

      return response.data;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Serper API Error';
      throw new Error(`Serper Error: ${errorMessage}`);
    }
  }

  private async searchNews(query: string, apiKey: string) {
    try {
      const response = await this.runSearch('news', query, apiKey);

      return (response.news || []).slice(0, 5).map((item: any) => ({
        title: item.title,
        link: item.link,
        source: item.source || 'Unknown',
        date: item.date || 'Recent',
      }));
    } catch (err: any) {
      this.logger.warn(
        `News search failed (Falling back to empty): ${err.message}`,
      );
      throw err;
    }
  }

  private async searchSocial(query: string, apiKey: string) {
    try {
      const socialQuery = `"${query}" (site:twitter.com OR site:x.com OR site:linkedin.com OR site:facebook.com OR site:instagram.com)`;

      const response = await this.runSearch('search', socialQuery, apiKey);

      return (response.organic || []).slice(0, 5).map((item: any) => ({
        title: item.title,
        link: item.link,
        platform: this.identifyPlatform(item.link),
      }));
    } catch (err: any) {
      this.logger.warn(
        `Social search failed (Falling back to empty): ${err.message}`,
      );
      throw err;
    }
  }

  private identifyPlatform(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('linkedin.com')) return 'LinkedIn';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com'))
      return 'X / Twitter';
    if (lowerUrl.includes('facebook.com')) return 'Facebook';
    if (lowerUrl.includes('instagram.com')) return 'Instagram';
    if (lowerUrl.includes('youtube.com')) return 'YouTube';
    return 'Web Source';
  }
}
