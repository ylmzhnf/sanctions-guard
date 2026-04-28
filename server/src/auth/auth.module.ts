import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategy/jwt.strategy';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { AuditModule } from 'src/audit/audit.module';
import { PassportModule } from '@nestjs/passport';
import { JwtGuard } from './guard/jwt.guard';
import { PlanGuard } from './guard/plan.guard';
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '7d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtGuard, PlanGuard],
  exports: [AuthService, JwtGuard, PlanGuard],
})
export class AuthModule {}
