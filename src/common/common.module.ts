import { Global, Module } from '@nestjs/common';
import { SmsService } from './services/sms.service';
import { AliyunSmsService } from './services/aliyun-sms.service';
import { UserContextService } from './services/user-context.service';
import { DistributedLockService } from './services/distributed-lock.service';
import { PrismaModule } from '@/database/prisma/prisma.module';
import { RedisModule } from '@/database/redis/redis.module';

/**
 * 全局通用模块
 * 提供跨模块共享的服务
 */
@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [SmsService, AliyunSmsService, UserContextService, DistributedLockService],
  exports: [SmsService, AliyunSmsService, UserContextService, DistributedLockService],
})
export class CommonModule {}
