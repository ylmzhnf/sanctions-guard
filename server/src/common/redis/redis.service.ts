import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis('redis://localhost:6379', {
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error`, err);
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Failed to set Redis key: ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Failed to delete Redis key: ${key}`, err);
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const val = await this.client.incr(key);
    if (ttlSeconds) {
      await this.client.expire(key, ttlSeconds);
    }
    return val;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
