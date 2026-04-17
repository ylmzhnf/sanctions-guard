import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export class PlanGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const orgId = request.user?.orgId;

    if (!orgId) {
      throw new ForbiddenException('Organization ID not found');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        plan: true,
        queriesUsed: true,
        queriesLimit: true,
      },
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    if (org.queriesUsed >= org.queriesLimit) {
      throw new ForbiddenException(
        ` You have reached your monthly query limit  ${org.queries.limit}` +
          `Please go to the subscription page to upgrade your plan. `,
      );
    }

    return true;
  }
}
