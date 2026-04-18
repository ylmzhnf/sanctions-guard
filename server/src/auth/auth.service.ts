import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('This email address is already in use.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name:
              dto.orgName ||
              `${dto.name || normalizedEmail.split('@')[0]}'s Organization`,
            plan: 'FREE',
            queriesLimit: 10,
          },
        });

        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: dto.name,
            orgId: org.id,
            role: Role.ADMIN,
          },
        });

        return { user, org };
      });

      const token = this.signToken(
        result.user.id,
        result.user.email,
        result.org.id,
        result.user.role,
      );

      return {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          orgId: result.org.id,
          plan: result.org.plan,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This email address is already in use.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const authErrorMsg = 'Invalid email or password.';

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException(authErrorMsg);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException(authErrorMsg);
    }

    if (!user.orgId) {
      throw new UnauthorizedException('User has no organization assigned');
    }

    const token = this.signToken(user.id, user.email, user.orgId, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
        plan: user.organization?.plan,
        queriesUsed: user.organization?.queriesUsed,
        queriesLimit: user.organization?.queriesLimit,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { organization: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      org: {
        id: user.organization?.id,
        name: user.organization?.name,
        plan: user.organization?.plan,
        queriesUsed: user.organization?.queriesUsed,
        queriesLimit: user.organization?.queriesLimit,
      },
    };
  }

  private signToken(
    userId: string,
    email: string,
    orgId: string,
    role: string,
  ): string {
    return this.jwtService.sign({ sub: userId, email, orgId, role });
  }
}
