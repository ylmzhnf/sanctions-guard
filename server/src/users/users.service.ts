import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EditUserDto } from './dto/edit-user.dto';
import { Role, Prisma, User } from '@prisma/client';
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
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return user;
  }

  
  async editUser(userId: string, dto: EditUserDto) {
    const updateData: Prisma.UserUpdateInput = {
      name: dto.name,
      email: dto.email?.toLowerCase().trim(),
    };

    if (dto.password) {
      updateData.passwordHash = await this.hashPassword(dto.password);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
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
    if (!email || !dto.password) {
      throw new ConflictException('E-posta ve şifre zorunludur.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');

    const passwordHash = await this.hashPassword(dto.password);

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
      select: { orgId: true },
    });

    if (!targetUser || targetUser.orgId !== adminOrgId) {
      throw new ForbiddenException(
        'Güvenlik Uyarısı: Sadece kendi organizasyonunuzdaki kullanıcıları yönetebilirsiniz.',
      );
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
    });
  }

  async changePassword(userId: string, newPassword: string) {
    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { success: true };
  }

  
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}