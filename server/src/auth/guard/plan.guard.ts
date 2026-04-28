import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.orgId) return false;

    if (process.env.APP_MODE === 'enterprise') return true;

    const org =
      user.org ||
      (await this.prisma.organization.findUnique({
        where: { id: user.orgId },
        select: {
          plan: true,
          queriesUsed: true,
          queriesLimit: true,
          isUnlimited: true,
        },
      }));

    if (!org) throw new ForbiddenException('Organization not found');

    if (org.isUnlimited || ['ENTERPRISE', 'BUSINESS'].includes(org.plan)) {
      return true;
    }

    if (org.queriesUsed >= org.queriesLimit) {
      throw new ForbiddenException(
        `Monthly query limit (${org.queriesLimit}) reached. Please upgrade your plan.`,
      );
    }

    return true;
  }
}
