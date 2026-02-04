import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto/authdto.dto';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  //kullanici kaydi
  async register(dto: AuthDto) {
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(dto.password, salt);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashPassword,
          role: 'USER',
        },
      });
      return this.generateToken(
        user.id,
        user.email,
        user.role as 'USER' | 'ADMIN',
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email already exists');
        }
      }
      throw error;
    }
  }

  async login(dto: AuthDto) {
    //kullanici var mi
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    //sifre dogrulama
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Wrong password');
    }
    return this.generateToken(
      user.id,
      user.email,
      user.role as 'USER' | 'ADMIN',
    );
  }

  async generateToken(
    userId: number,
    email: string,
    role: string,
  ): Promise<{ access_token: string }> {
    const payload = { sub: userId, email, role };
    const token = await this.jwtService.signAsync(payload);
    return { access_token: token };
  }
}
