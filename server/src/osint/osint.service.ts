import { Injectable, Logger } from '@nestjs/common';

interface SerperNewsItem {
  title: string;
  link: string;
  source: string;
  date: string;
}

interface SerperOrganicItem {
  title: string;
  link: string;
  snippet?: string;
}

export interface OsintResult {
  news: Array<{ title: string; link: string; source: string; date: string }>;
  social: Array<{ title: string; link: string; platform: string }>;
}

@Injectable()
export class OsintService {
  private readonly logger = new Logger(OsintService.name);
  private readonly apiKey = process.env.SERPER_API_KEY;

  async fetchResults(name: string): Promise<OsintResult> {
    if (!this.apiKey) {
      this.logger.warn('SERPER_API_KEY is not set. OSINT search skipped.');
      return { news: [], social: [] };
    }

    try {
      const [news, social] = await Promise.all([
        this.searchNews(name),
        this.searchSocial(name),
      ]);

      return { news, social };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`OSINT search failed for ${name}: ${errorMessage}`);
      return { news: [], social: [] };
    }
  }

  private async searchNews(query: string) {
    try {
      const response = await fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey as string,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, gl: 'us', hl: 'en' }),
      });

      if (!response.ok) {
        throw new Error(`News API returned status: ${response.status}`);
      }

      const data = await response.json();
      const newsItems: SerperNewsItem[] = data.news || [];

      return newsItems.slice(0, 5).map((item) => ({
        title: item.title,
        link: item.link,
        source: item.source,
        date: item.date,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`News search failed: ${errorMessage}`);
      return [];
    }
  }

  private async searchSocial(query: string) {
    try {
      const socialQuery = `${query} site:twitter.com OR site:linkedin.com OR site:facebook.com OR site:instagram.com`;

      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey as string,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: socialQuery, gl: 'us', hl: 'en' }),
      });

      if (!response.ok) {
        throw new Error(`Social API returned status: ${response.status}`);
      }

      const data = await response.json();
      const organicItems: SerperOrganicItem[] = data.organic || [];

      return organicItems.slice(0, 5).map((item) => {
        let platform = 'Social Media';
        if (item.link.includes('twitter.com') || item.link.includes('x.com'))
          platform = 'Twitter/X';
        else if (item.link.includes('linkedin.com')) platform = 'LinkedIn';
        else if (item.link.includes('facebook.com')) platform = 'Facebook';
        else if (item.link.includes('instagram.com')) platform = 'Instagram';

        return {
          title: item.title,
          link: item.link,
          platform,
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Social search failed: ${errorMessage}`);
      return [];
    }
  }
}
