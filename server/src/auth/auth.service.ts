import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma, Role, User, Organization } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
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
    const email = dto.email.toLowerCase().trim();

    
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Bu e-posta adresi zaten kullanımda.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      
      const { user, org } = await this.prisma.$transaction(async (tx) => {
        const newOrg = await tx.organization.create({
          data: {
            name:
              dto.orgName ||
              `${dto.name || email.split('@')[0]}'s Organization`,
            plan: 'FREE',
            queriesLimit: 10,
          },
        });

        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: dto.name,
            orgId: newOrg.id,
            role: Role.ADMIN, 
          },
        });

        return { user: newUser, org: newOrg };
      });

      
      await this.audit.log({
        action: 'USER_REGISTERED',
        actorId: user.id,
        orgId: org.id,
        metadata: { email, orgName: org.name },
      });

      const token = this.signToken(user.id, user.email, org.id, user.role);
      return { token, user: this.formatUserResponse(user, org) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Bu e-posta adresi zaten kullanımda.');
      }
      this.logger.error('Kayıt işlemi sırasında beklenmedik hata:', error);
      throw error;
    }
  }

  
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const invalidMsg = 'Geçersiz e-posta veya şifre.';

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    
    if (!user || !user.isActive) {
      this.logger.warn(
        `Giriş başarısız (Kullanıcı bulunamadı veya pasif): ${email}`,
      );
      throw new UnauthorizedException(invalidMsg);
    }

    
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn(`Hatalı şifre denemesi: ${email}`);
      throw new UnauthorizedException(invalidMsg);
    }

    
    if (!user.organization) {
      throw new UnauthorizedException(
        'Kullanıcı bir organizasyona bağlı değil.',
      );
    }

    
    await this.audit.log({
      action: 'USER_LOGIN',
      actorId: user.id,
      orgId: user.organization.id,
      metadata: { method: 'JWT_LOGIN' },
    });

    const token = this.signToken(
      user.id,
      user.email,
      user.organization.id,
      user.role,
    );
    return { token, user: this.formatUserResponse(user, user.organization) };
  }

  
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

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

  
  private formatUserResponse(user: User, org: Organization) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        queriesUsed: org.queriesUsed,
        queriesLimit: org.queriesLimit,
        isUnlimited: org.isUnlimited,
      },
    };
  }
}
