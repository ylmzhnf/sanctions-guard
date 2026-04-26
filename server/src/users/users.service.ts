import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto/edit-user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        organization: { select: { name: true, plan: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async editUser(userId: string, dto: EditUserDto) {
    const { password, ...rest } = dto;
    const data: any = { ...rest };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async getAllUsersInOrg(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addUserToOrg(orgId: string, dto: EditUserDto) {
    const email = dto.email?.toLowerCase().trim();
    if (!email || !dto.password)
      throw new ConflictException('Email and password required');

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name,
        role: dto.role || Role.USER,
        orgId: orgId,
        mustChangePassword: true,
      },
    });
  }

  async updateUserRole(adminOrgId: string, targetUserId: string, role: Role) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.orgId !== adminOrgId) {
      throw new ForbiddenException(
        'Security Alert: You can only manage users within your own organization.',
      );
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
    });
  }

  async changePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { success: true };
  }
}
