import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestWithUser } from 'src/auth/types/auth.types'; // Tip güvenliği için ekledik

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const orgId = request.user?.orgId;

    if (!orgId) {
      throw new ForbiddenException('Organization ID not found');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, queriesUsed: true, queriesLimit: true },
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    if (org.plan === 'ENTERPRISE' || org.plan === 'BUSINESS') {
      return true;
    }

    if (org.queriesUsed >= org.queriesLimit) {
      throw new ForbiddenException(
        'Monthly limit reached. Please upgrade your plan.',
      );
    }

    return true;
  }
}
