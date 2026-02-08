import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto/edit-user.dto';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  //profili getir
  async getUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  // Profil güncelle
  async editUser(userId: number, dto: EditUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    return user;
  }
}
