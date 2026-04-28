import { Injectable, OnModuleDestroy, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        this.logger.warn(`Redis connection lost. Retrying in ${delay}ms... (Attempt ${times})`);
        return delay;
      },
      
      maxRetriesPerRequest: 10,
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Critical Error:', err.message);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (err) {
      this.logger.error('Could not initialize Redis connection', err);
    }
  }

  
  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.error(`Redis GET failed for key: ${key}`, err);
      return null;
    }
  }

  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const data = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      if (ttl) {
        await this.client.set(key, data, 'EX', ttl);
      } else {
        await this.client.set(key, data);
      }
    } catch (err) {
      this.logger.error(`Redis SET failed for key: ${key}`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error(`Redis DEL failed for key: ${key}`, err);
    }
  }

  
  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Closing Redis connection...');
    await this.client.quit();
  }
}