import { Module } from '@nestjs/common';
import { OsintService } from './osint.service';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [OsintService],
  exports: [OsintService],
})
export class OsintModule {}
