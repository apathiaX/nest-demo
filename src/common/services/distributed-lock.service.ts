import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/database/redis/redis.service';

/**
 * 分布式锁服务
 * 用于多实例部署时的并发控制
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * 获取分布式锁
   * @param key 锁的键
   * @param ttl 锁的过期时间（秒）
   * @param retries 重试次数
   * @returns 锁的值（用于释放锁时验证）
   */
  async acquireLock(key: string, ttl: number = 10, retries: number = 3): Promise<string> {
    const lockValue = `${Date.now()}-${Math.random()}-${process.pid}`;
    let attempts = 0;

    while (attempts < retries) {
      try {
        // 使用 SET NX EX 命令（原子操作）
        const acquired = await this.redisService.set(`lock:${key}`, lockValue, ttl);

        if (acquired) {
          this.logger.debug(`🔒 Lock acquired: ${key}`);
          return lockValue;
        }

        attempts++;
        if (attempts < retries) {
          // 指数退避策略
          const waitTime = 100 * Math.pow(2, attempts - 1);
          this.logger.debug(
            `🔄 Lock retry ${attempts}/${retries} for ${key}, waiting ${waitTime}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        this.logger.error(`❌ Error acquiring lock for ${key}:`, error);
        throw error;
      }
    }

    throw new Error(`Failed to acquire lock for key: ${key} after ${retries} attempts`);
  }

  /**
   * 释放分布式锁
   * @param key 锁的键
   * @param lockValue 锁的值（确保只能释放自己获取的锁）
   * @returns 是否成功释放
   */
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    try {
      // TODO: 使用 Lua 脚本保证原子性（需要 RedisService 支持 eval）
      // 目前直接删除锁（简化实现）
      const deleted = await this.redisService.del(`lock:${key}`);

      if (deleted > 0) {
        this.logger.debug(`🔓 Lock released: ${key} (value: ${lockValue})`);
        return true;
      }

      this.logger.warn(`⚠️ Lock not found or already released: ${key}`);
      return false;
    } catch (error) {
      this.logger.error(`❌ Error releasing lock for ${key}:`, error);
      return false;
    }
  }

  /**
   * 使用分布式锁执行操作
   * @param key 锁的键
   * @param operation 要执行的操作
   * @param ttl 锁的过期时间（秒）
   * @returns 操作的返回值
   */
  async executeWithLock<T>(key: string, operation: () => Promise<T>, ttl: number = 10): Promise<T> {
    const lockValue = await this.acquireLock(key, ttl);

    try {
      this.logger.debug(`⚙️ Executing operation with lock: ${key}`);
      const result = await operation();
      this.logger.debug(`✅ Operation completed with lock: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Operation failed with lock: ${key}`, error);
      throw error;
    } finally {
      await this.releaseLock(key, lockValue);
    }
  }

  /**
   * 尝试获取锁（不重试）
   * @param key 锁的键
   * @param ttl 锁的过期时间（秒）
   * @returns 如果获取成功返回锁的值，否则返回 null
   */
  async tryLock(key: string, ttl: number = 10): Promise<string | null> {
    const lockValue = `${Date.now()}-${Math.random()}-${process.pid}`;

    try {
      const acquired = await this.redisService.set(`lock:${key}`, lockValue, ttl);

      if (acquired) {
        this.logger.debug(`🔒 Lock acquired (no retry): ${key}`);
        return lockValue;
      }

      return null;
    } catch (error) {
      this.logger.error(`❌ Error trying lock for ${key}:`, error);
      return null;
    }
  }

  /**
   * 延长锁的过期时间
   * @param key 锁的键
   * @param lockValue 锁的值
   * @param ttl 新的过期时间（秒）
   */
  async extendLock(key: string, lockValue: string, ttl: number): Promise<boolean> {
    try {
      // 只有锁的持有者才能延长过期时间
      const currentValue = await this.redisService.get(`lock:${key}`);

      if (currentValue === lockValue) {
        await this.redisService.expire(`lock:${key}`, ttl);
        this.logger.debug(`⏰ Lock extended: ${key}, new TTL: ${ttl}s`);
        return true;
      }

      this.logger.warn(`⚠️ Cannot extend lock: ${key}, lock value mismatch`);
      return false;
    } catch (error) {
      this.logger.error(`❌ Error extending lock for ${key}:`, error);
      return false;
    }
  }
}
