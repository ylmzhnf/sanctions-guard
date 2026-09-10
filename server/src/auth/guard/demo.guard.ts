import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { RedisService } from '../../common/redis/redis.service';
import {
  ALLOW_DEMO_WRITE_KEY,
  DEMO_RATE_LIMIT_KEY,
  DemoRateLimitOptions,
} from '../decorator/allow-demo-write.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

interface DecodedJwt {
  sub?: string;
  isDemo?: boolean;
}

@Injectable()
export class DemoGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const payload = this.decodeToken(request);

    if (!payload?.isDemo) {
      return true;
    }

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_DEMO_WRITE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowed) {
      throw new ForbiddenException(
        'This action is disabled in Demo Mode. Sign up for a real account to perform this operation.',
      );
    }

    const rateLimit = this.reflector.getAllAndOverride<DemoRateLimitOptions>(
      DEMO_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (rateLimit) {
      await this.enforceRateLimit(request, payload, rateLimit);
    }

    return true;
  }

  private decodeToken(request: Request): DecodedJwt | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    try {
      return this.jwtService.verify<DecodedJwt>(authHeader.slice(7));
    } catch {
      return null;
    }
  }

  private async enforceRateLimit(
    request: Request,
    payload: DecodedJwt,
    { limit, windowSeconds }: DemoRateLimitOptions,
  ): Promise<void> {
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.ip ||
      'unknown';

    const key = `demo-rate-limit:${request.method}:${request.path}:${payload.sub}:${ip}`;
    const client = this.redis.getClient();

    let count: number;
    try {
      count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, windowSeconds);
      }
    } catch {
      return;
    }

    if (count > limit) {
      throw new ForbiddenException(
        'Demo rate limit reached. Please try again later.',
      );
    }
  }
}
