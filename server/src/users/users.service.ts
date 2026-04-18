import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto/edit-user.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        orgId: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async editUser(userId: string, dto: EditUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
      select: { id: true, email: true, username: true, name: true },
    });
  }

  async getAllUsersInOrg(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(adminOrgId: string, targetUserId: string, role: Role) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.orgId !== adminOrgId) {
      throw new ForbiddenException(
        'You can only manage users within your own organization.',
      );
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
    });
  }
}
