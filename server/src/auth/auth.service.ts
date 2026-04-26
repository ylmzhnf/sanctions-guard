import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma, Role } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
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

      await this.audit.log({
        action: 'USER_REGISTERED',
        actorId: result.user.id,
        orgId: result.org.id,
        metadata: { email: normalizedEmail, orgName: result.org.name },
      });

      const token = this.signToken(
        result.user.id,
        result.user.email,
        result.org.id,
        result.user.role,
      );

      return {
        token,
        user: this.formatUserResponse(result.user, result.org),
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
      this.logger.warn(`Failed login attempt for email: ${normalizedEmail}`);
      throw new UnauthorizedException(authErrorMsg);
    }

    if (!user.orgId || !user.organization) {
      throw new UnauthorizedException(
        'User is not linked to any organization.',
      );
    }

    await this.audit.log({
      action: 'USER_LOGIN',
      actorId: user.id,
      orgId: user.orgId,
      metadata: { ip: 'logged_session' },
    });

    const token = this.signToken(user.id, user.email, user.orgId, user.role);

    return {
      token,
      user: this.formatUserResponse(user, user.organization),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { organization: true },
    });

    return this.formatUserResponse(user, user.organization!);
  }

  private signToken(
    userId: string,
    email: string,
    orgId: string,
    role: string,
  ): string {
    return this.jwtService.sign({ sub: userId, email, orgId, role });
  }

  private formatUserResponse(user: any, org: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      org: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        queriesUsed: org.queriesUsed,
        queriesLimit: org.queriesLimit,
        isLifetime: org.isLifetime,
      },
    };
  }
}
