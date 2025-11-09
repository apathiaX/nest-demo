import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/database/redis/redis.service';
import { AliyunSmsService } from './aliyun-sms.service';

/**
 * 验证码存储结构
 */
interface VerificationCodeData {
  code: string;
  expiresAt: number;
  type: string;
  usedCount: number; // 已使用次数
  maxUses: number; // 最大使用次数
  createdAt: number; // 创建时间
}

/**
 * 短信服务
 * 用于发送和验证短信验证码
 * 使用 Redis 存储验证码数据
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly CODE_PREFIX = 'sms:code:'; // Redis key 前缀
  private readonly FREQ_PREFIX = 'sms:freq:'; // 频率限制前缀

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly aliyunSmsService: AliyunSmsService,
  ) {}

  /**
   * 生成 Redis key
   */
  private getCodeKey(phone: string, type: string): string {
    return `${this.CODE_PREFIX}${phone}:${type}`;
  }

  /**
   * 生成频率限制 key
   */
  private getFreqKey(phone: string, type: string): string {
    return `${this.FREQ_PREFIX}${phone}:${type}`;
  }

  /**
   * 发送验证码
   * 🔒 当前短信发送功能已关闭，验证码仅在日志中输出
   * @param phone 手机号
   * @param type 验证码类型
   * @param maxUses 最大使用次数（默认1次，设为0表示无限制）
   */
  async sendVerificationCode(
    phone: string,
    type: 'register' | 'login' | 'change_phone' | 'reset_password',
    maxUses: number = 1,
  ): Promise<{ message: string; expiresIn: number }> {
    // 检查发送频率
    await this.checkSendFrequency(phone, type);

    // 生成6位数字验证码
    const code = this.generateCode();

    // 设置过期时间（5分钟）
    const ttl = 300;
    const key = this.getCodeKey(phone, type);

    // 存储验证码数据
    const data: VerificationCodeData = {
      code,
      expiresAt: Date.now() + ttl * 1000,
      type,
      usedCount: 0,
      maxUses,
      createdAt: Date.now(),
    };

    // 保存到 Redis（设置5分钟过期）
    await this.redisService.set(key, JSON.stringify(data), ttl);

    // 设置频率限制（60秒冷却期）
    const freqKey = this.getFreqKey(phone, type);
    await this.redisService.set(freqKey, '1', 60);

    // 在开发环境，直接在日志中显示验证码
    const isDevelopment = this.configService.get<boolean>('isDevelopment');
    if (isDevelopment) {
      this.logger.log(`📱 验证码已生成 - 手机号: ${phone}, 验证码: ${code}, 类型: ${type}`);
      this.logger.log(`⏰ 有效期: 5分钟, 最大使用次数: ${maxUses === 0 ? '无限制' : maxUses}`);
    }

    // 🔒 短信发送功能已关闭，不会实际调用第三方服务
    // 需要时在 aliyun-sms.service.ts 中取消注释即可恢复
    // 生产环境也会在日志中输出验证码
    await this.sendSms(phone, code, type);

    return {
      message: 'Verification code sent successfully',
      expiresIn: ttl,
    };
  }

  /**
   * 验证验证码
   * @param phone 手机号
   * @param code 验证码
   * @param type 验证码类型
   * @param autoDelete 验证成功后是否自动删除（默认false）
   */
  async verifyCode(
    phone: string,
    code: string,
    type: 'register' | 'login' | 'change_phone' | 'reset_password',
    autoDelete: boolean = false,
  ): Promise<boolean> {
    const key = this.getCodeKey(phone, type);
    const dataStr = await this.redisService.get(key);

    if (!dataStr) {
      throw new BadRequestException('Verification code not found or expired');
    }

    const stored: VerificationCodeData = JSON.parse(dataStr);

    // 检查是否过期
    if (Date.now() > stored.expiresAt) {
      await this.redisService.del(key);
      throw new BadRequestException('Verification code expired');
    }

    // 验证码是否匹配
    if (stored.code !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    // 检查使用次数限制
    if (stored.maxUses > 0 && stored.usedCount >= stored.maxUses) {
      await this.redisService.del(key);
      throw new BadRequestException('Verification code has been used up');
    }

    // 增加使用次数
    stored.usedCount += 1;

    // 如果设置了自动删除，或达到最大使用次数，则删除验证码
    if (autoDelete || (stored.maxUses > 0 && stored.usedCount >= stored.maxUses)) {
      await this.redisService.del(key);
      this.logger.log(`🗑️ 验证码已删除 - 手机号: ${phone}, 类型: ${type}`);
    } else {
      // 更新使用次数，保留剩余 TTL
      const remainingTtl = Math.ceil((stored.expiresAt - Date.now()) / 1000);
      await this.redisService.set(key, JSON.stringify(stored), remainingTtl);
      this.logger.log(
        `✅ 验证码验证成功 - 手机号: ${phone}, 类型: ${type}, 已使用: ${stored.usedCount}/${stored.maxUses === 0 ? '∞' : stored.maxUses}`,
      );
    }

    return true;
  }

  /**
   * 验证验证码（不消耗使用次数，仅检查）
   */
  async checkCode(
    phone: string,
    code: string,
    type: 'register' | 'login' | 'change_phone' | 'reset_password',
  ): Promise<boolean> {
    const key = this.getCodeKey(phone, type);
    const dataStr = await this.redisService.get(key);

    if (!dataStr) {
      return false;
    }

    const stored: VerificationCodeData = JSON.parse(dataStr);

    // 检查是否过期
    if (Date.now() > stored.expiresAt) {
      return false;
    }

    // 检查是否已达到最大使用次数
    if (stored.maxUses > 0 && stored.usedCount >= stored.maxUses) {
      return false;
    }

    return stored.code === code;
  }

  /**
   * 手动删除验证码
   */
  async deleteCode(
    phone: string,
    type: 'register' | 'login' | 'change_phone' | 'reset_password',
  ): Promise<void> {
    const key = this.getCodeKey(phone, type);
    await this.redisService.del(key);
    this.logger.log(`🗑️ 验证码已手动删除 - 手机号: ${phone}, 类型: ${type}`);
  }

  /**
   * 获取验证码信息（用于调试）
   */
  async getCodeInfo(
    phone: string,
    type: 'register' | 'login' | 'change_phone' | 'reset_password',
  ): Promise<VerificationCodeData | null> {
    const key = this.getCodeKey(phone, type);
    const dataStr = await this.redisService.get(key);

    if (!dataStr) {
      return null;
    }

    return JSON.parse(dataStr);
  }

  /**
   * 生成验证码
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 发送短信（调用阿里云服务）
   * 如果阿里云未配置，则回退到开发模式（仅日志）
   */
  private async sendSms(phone: string, code: string, type: string): Promise<void> {
    try {
      // 尝试通过阿里云发送短信
      const success = await this.aliyunSmsService.sendVerificationCode(
        phone,
        code,
        type as 'register' | 'login' | 'change_phone' | 'reset_password',
      );

      if (success) {
        this.logger.log(`✅ 短信发送成功 - 手机号: ${phone}, 类型: ${type}`);
      } else {
        // 阿里云未配置或发送失败，回退到日志模式
        this.logger.warn(`⚠️ 阿里云短信发送失败，回退到日志模式`);
        this.logger.log(`📱 验证码 - 手机号: ${phone}, 验证码: ${code}, 类型: ${type}`);
      }
    } catch (error) {
      this.logger.error(`❌ 短信发送异常:`, error);
      // 发生异常时，在开发环境输出验证码
      const isDevelopment = this.configService.get<boolean>('isDevelopment');
      if (isDevelopment) {
        this.logger.log(`📱 [降级] 验证码 - 手机号: ${phone}, 验证码: ${code}, 类型: ${type}`);
      }
    }
  }

  /**
   * 检查验证码发送频率（防止滥用）
   */
  private async checkSendFrequency(
    phone: string,
    type: 'register' | 'login' | 'change_phone' | 'reset_password',
  ): Promise<boolean> {
    const freqKey = this.getFreqKey(phone, type);
    const exists = await this.redisService.exists(freqKey);

    if (exists) {
      const ttl = await this.redisService.ttl(freqKey);
      throw new BadRequestException(`Please wait ${ttl} seconds before requesting a new code`);
    }

    return true;
  }

  /**
   * 清理过期验证码（定时任务）
   * Redis 会自动清理过期数据，此方法保留用于手动清理
   */
  async cleanExpiredCodes(): Promise<void> {
    // Redis 的 TTL 机制会自动清理过期数据
    // 这里可以实现额外的清理逻辑
    this.logger.log('Redis will automatically clean expired codes');
  }
}
