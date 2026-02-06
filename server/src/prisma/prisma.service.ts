import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter } as any);
  }
  async onModuleInit() {
    await this.$connect();
    Object.assign(
      this,
      this.$extends({
        query: {
          auditLog: {
            update: () => {
              return Promise.reject(
                new Error(
                  'Audit log should be immutable and not allow updates.',
                ),
              );
            },
            delete: () => {
              return Promise.reject(
                new Error(
                  'Audit log should be immutable and not allow updates.',
                ),
              );
            },
            deleteMany: ({ args, query }) => {
              if (this.configService.get('NODE_ENV') === 'test') {
                return query(args);
              }
              return Promise.reject(
                new Error(
                  'Audit log should be immutable and not allow updates.',
                ),
              );
            },
          },
        },
      }),
    );
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
