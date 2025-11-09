import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      socket: {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
      },
      password: this.configService.get('REDIS_PASSWORD'),
      database: this.configService.get('REDIS_DB', 0),
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Redis connection error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('🔄 Redis connecting...');
    });

    this.client.on('ready', () => {
      this.logger.log('✅ Redis connected and ready');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  getClient(): RedisClientType {
    return this.client;
  }

  /**
   * GET - 获取值
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * SET - 设置值
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒）
   * @param mode 设置模式：'NX' 只在键不存在时设置，'XX' 只在键存在时设置
   */
  async set(key: string, value: string, ttl?: number, mode?: 'NX' | 'XX'): Promise<string | null> {
    if (ttl && mode) {
      // SET key value EX seconds NX|XX
      return this.client.set(key, value, {
        EX: ttl,
        NX: mode === 'NX',
        XX: mode === 'XX',
      });
    } else if (ttl) {
      return this.client.setEx(key, ttl, value);
    } else if (mode) {
      return this.client.set(key, value, {
        NX: mode === 'NX',
        XX: mode === 'XX',
      });
    }
    return this.client.set(key, value);
  }

  /**
   * DEL - 删除键
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * EXISTS - 检查键是否存在
   */
  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  /**
   * TTL - 获取键的剩余生存时间（秒）
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * INCR - 将键的值加1
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * EXPIRE - 设置键的过期时间
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  /**
   * KEYS - 查找所有符合给定模式的键
   * 注意：生产环境谨慎使用，可能影响性能
   */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
