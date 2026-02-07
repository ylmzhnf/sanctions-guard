import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ScreeningModule } from './screening/screening.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    ScreeningModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
