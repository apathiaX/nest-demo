import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { RedisModule } from './database/redis/redis.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PlanModule } from './modules/plan/plan.module';
import { TaskModule } from './modules/task/task.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { configuration } from './config/configuration';

// 根据环境变量加载不同的配置文件
const envFilePath = () => {
  const env = process.env.NODE_ENV || 'development';
  const envFiles = [`.env.${env}`, '.env.local', '.env'];
  console.log(`🔧 Loading environment: ${env}`);
  console.log(`📁 Environment files priority: ${envFiles.join(', ')}`);
  return envFiles;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: envFilePath(),
      cache: true, // 缓存配置提高性能
      expandVariables: true, // 支持变量展开
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl', 60) * 1000,
          limit: config.get<number>('throttle.limit', 10),
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    CommonModule,
    AuthModule,
    UserModule,
    PlanModule,
    TaskModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局启用 JWT 认证守卫
    // 所有接口默认都需要认证，除非使用 @Public() 装饰器
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 全局启用角色守卫
    // 使用 @Roles() 装饰器标记需要的角色
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // 全局启用权限守卫
    // 使用 @RequirePermissions() 装饰器标记需要的权限
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
