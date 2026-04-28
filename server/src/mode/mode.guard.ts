import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { Plan } from '@prisma/client';


export const MODE_METADATA_KEY = 'app_mode_restriction';
export const FEATURE_METADATA_KEY = 'required_feature';

export enum ModeRestriction {
  SAAS_ONLY = 'SAAS_ONLY',
  ENTERPRISE_ONLY = 'ENTERPRISE_ONLY',
}


export const SaasOnly = () => SetMetadata(MODE_METADATA_KEY, ModeRestriction.SAAS_ONLY);
export const EnterpriseOnly = () => SetMetadata(MODE_METADATA_KEY, ModeRestriction.ENTERPRISE_ONLY);
export const RequireFeature = (feature: string) => SetMetadata(FEATURE_METADATA_KEY, feature);


@Injectable()
export class ModeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: AppConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const restriction = this.reflector.getAllAndOverride<ModeRestriction>(
      MODE_METADATA_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!restriction) return true;

    const isEnterprise = this.config.isEnterprise();

    
    if (restriction === ModeRestriction.SAAS_ONLY && isEnterprise) {
      throw new NotFoundException('Endpoint not found in this deployment mode');
    }

    
    if (restriction === ModeRestriction.ENTERPRISE_ONLY && !isEnterprise) {
      throw new NotFoundException('Endpoint not found in this deployment mode');
    }

    return true;
  }
}


@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private config: AppConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    
    if (this.config.isEnterprise()) return true;

    const req = ctx.switchToHttp().getRequest();
    const orgId = req.user?.orgId;
    if (!orgId) return true;

    
    const cacheKey = `org_limit_reached:${orgId}`;
    const isLocked = await this.redis.get(cacheKey);
    if (isLocked) {
      throw new ForbiddenException('Monthly query limit reached. Please upgrade your plan.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { queriesUsed: true, queriesLimit: true, isUnlimited: true },
    });

    if (!org || org.isUnlimited || org.queriesLimit === -1) return true;

    if (org.queriesUsed >= org.queriesLimit) {
      
      await this.redis.set(cacheKey, 'true', 3600);
      throw new ForbiddenException(`Monthly query limit (${org.queriesLimit}) reached.`);
    }

    return true;
  }
}


@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: AppConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string>(
      FEATURE_METADATA_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!feature) return true;

    
    if (this.config.isEnterprise()) return true;

    const req = ctx.switchToHttp().getRequest();
    const orgId = req.user?.orgId;
    if (!orgId) return false;

    
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    const plan = org?.plan || Plan.FREE;

    
    const FEATURES: Record<Plan, string[]> = {
      FREE: ['basic_search'],
      STARTER: ['basic_search', 'pdf_reports', 'ai_explanation'],
      BUSINESS: ['basic_search', 'pdf_reports', 'ai_explanation', 'osint', 'api_access', 'bulk_screening'],
      ENTERPRISE: ['*'], 
      SELF_HOSTED: ['*'], 
    };

    const allowedFeatures = FEATURES[plan] || [];
    const hasAccess = allowedFeatures.includes('*') || allowedFeatures.includes(feature);

    if (!hasAccess) {
      throw new ForbiddenException(
        `${feature.toUpperCase()} feature is not available on ${plan} plan.`,
      );
    }

    return true;
  }
}