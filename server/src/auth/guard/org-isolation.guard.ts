import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

export const SKIP_ORG_ISOLATION = 'skipOrgIsolation';
export const SkipOrgIsolation = () => Reflector.createDecorator<boolean>();

@Injectable()
export class OrgIsolationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipIsolation = this.reflector.getAllAndOverride<boolean>(
      SKIP_ORG_ISOLATION,
      [context.getHandler(), context.getClass()],
    );

    // Skip isolation check if decorator is present
    if (skipIsolation) {
      return true;
    }

    const { user, params, body } = context.switchToHttp().getRequest();

    // SUPER_ADMIN can access all organizations
    if (user?.role === Role.SUPER_ADMIN) {
      return true;
    }

    // For other roles, ensure they can only access their own organization's data
    const userOrgId = user?.orgId;
    const targetOrgId = params?.orgId || body?.orgId || params?.id;

    // If no organization context is provided, allow (will be handled by business logic)
    if (!targetOrgId) {
      return true;
    }

    // Check if user is trying to access data from their own organization
    if (userOrgId !== targetOrgId) {
      throw new ForbiddenException(
        'You can only access data from your own organization',
      );
    }

    return true;
  }
}