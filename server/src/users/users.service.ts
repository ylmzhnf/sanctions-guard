import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto/edit-user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
        mustChangePassword: true,
        organization: {
          select: {
            id: true,
            name: true,
            plan: true,
            queriesUsed: true,
            queriesLimit: true,
            isLifetime: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async editUser(userId: string, dto: EditUserDto) {
    const { password, ...rest } = dto;
    const updateData: any = { ...rest };

    if (password) {
      const salt = await bcrypt.genSalt(12);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        mustChangePassword: true,
      },
    });
  }

  async getAllUsersInOrg(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        mustChangePassword: true,
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
  async addUserToOrg(orgId: string, dto: EditUserDto) {
    if (!dto.email) {
      throw new BadRequestException('Email is required.');
    }
    if (!dto.password) {
      throw new BadRequestException('Password is required.');
    }

    const email = dto.email.toLowerCase().trim();
    const password = dto.password;

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('This email is already registered.');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    return this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        username: dto.username,
        passwordHash: passwordHash,
        role: dto.role || Role.USER,
        orgId: orgId,
        mustChangePassword: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async changePassword(userId: string, newPassword: string) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });
  }
}
