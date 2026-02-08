import { Reflector } from '@nestjs/core';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ROLE_KEY } from '../decorator/roles.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from '../types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    const hasRole = requiredRoles.some((role) => (user.role as Role) === role);
    if (!hasRole) {
      throw new ForbiddenException('Access Denied');
    }
    return hasRole;
  }
}
