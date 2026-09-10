import { SetMetadata } from '@nestjs/common';

export const ALLOW_DEMO_WRITE_KEY = 'allowDemoWrite';
export const AllowDemoWrite = () => SetMetadata(ALLOW_DEMO_WRITE_KEY, true);

export interface DemoRateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export const DEMO_RATE_LIMIT_KEY = 'demoRateLimit';
export const DemoRateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata(DEMO_RATE_LIMIT_KEY, { limit, windowSeconds });
