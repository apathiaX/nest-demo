import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Dysmsapi from '@alicloud/dysmsapi20170525';
// import * as $Dysmsapi from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
// import * as $Util from '@alicloud/tea-util';

@Injectable()
export class AliyunSmsService {
  private readonly logger = new Logger(AliyunSmsService.name);
  private client: Dysmsapi | null = null;
  private isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.initClient();
  }

  /**
   * 初始化阿里云客户端
   */
  private initClient(): void {
    try {
      const accessKeyId = this.configService.get('aliyun.accessKeyId');
      const accessKeySecret = this.configService.get('aliyun.accessKeySecret');

      // 检查是否配置了阿里云凭证
      if (!accessKeyId || !accessKeySecret) {
        this.logger.warn('⚠️ 阿里云短信服务未配置，将使用开发模式（日志输出）');
        this.isConfigured = false;
        return;
      }

      const config = new $OpenApi.Config({
        accessKeyId,
        accessKeySecret,
        // endpoint: this.configService.get('aliyun.sms.endpoint', 'dysmsapi.aliyuncs.com'),
      });

      this.client = new Dysmsapi(config);
      this.isConfigured = true;
      this.logger.log('✅ 阿里云短信服务已初始化');
    } catch (error) {
      this.logger.error('❌ 阿里云短信服务初始化失败:', error);
      this.isConfigured = false;
    }
  }

  /**
   * 发送短信验证码
   * 🔒 当前已关闭短信发送功能，仅返回成功状态
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    type: 'register' | 'login' | 'change_phone' | 'reset_password',
  ): Promise<boolean> {
    // 🔒 短信发送功能已关闭 - 直接返回 false，让调用方使用开发模式（日志输出）
    this.logger.log(`🔒 短信发送已关闭 - 手机号: ${phone}, 验证码: ${code}, 类型: ${type}`);
    return false;

    // ========== 以下代码保留，需要时取消注释即可恢复短信发送功能 ==========
    // // 如果未配置，返回 false（调用方会使用开发模式）
    // if (!this.isConfigured || !this.client) {
    //   this.logger.warn(`⚠️ 阿里云未配置，跳过发送 - 手机号: ${phone}, 验证码: ${code}`);
    //   return false;
    // }

    // try {
    //   const signName = this.configService.get('aliyun.sms.signName');
    //   const templateCode = this.getTemplateCode(type);

    //   if (!templateCode) {
    //     this.logger.error(`❌ 未配置短信模板 - 类型: ${type}`);
    //     return false;
    //   }

    //   const sendSmsRequest = new $Dysmsapi.SendSmsRequest({
    //     phoneNumbers: phone,
    //     signName,
    //     templateCode,
    //     templateParam: JSON.stringify({ code }),
    //   });

    //   const runtime = new $Util.RuntimeOptions({});
    //   const response = await this.client.sendSmsWithOptions(sendSmsRequest, runtime);

    //   this.logger.log(
    //     `📤 阿里云短信API响应 - 手机号: ${phone}, Code: ${response.body.code}, Message: ${response.body.message}`,
    //   );

    //   if (response.body.code === 'OK') {
    //     this.logger.log(
    //       `✅ 短信发送成功 - 手机号: ${phone}, RequestId: ${response.body.requestId}`,
    //     );
    //     return true;
    //   }

    //   this.logger.error(
    //     `❌ 短信发送失败 - Code: ${response.body.code}, Message: ${response.body.message}`,
    //   );
    //   return false;
    // } catch (error) {
    //   this.logger.error(`❌ 阿里云短信发送异常 - 手机号: ${phone}`, error);
    //   return false;
    // }
  }

  /**
   * 获取模板 Code
   */
  private getTemplateCode(type: 'register' | 'login' | 'change_phone' | 'reset_password'): string {
    const templates = this.configService.get('aliyun.sms.templates');
    return templates?.[type] || '';
  }

  /**
   * 检查服务是否已配置
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}
