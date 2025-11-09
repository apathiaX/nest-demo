export interface AliyunConfig {
  accessKeyId: string;
  accessKeySecret: string;
  sms?: {
    endpoint: string;
    signName: string;
    templates?: {
      register: string;
      login: string;
      change_phone: string;
      reset_password: string;
    };
  };
}

export const aliyunConfig = (): { aliyun: AliyunConfig } => ({
  aliyun: {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    sms: {
      endpoint: process.env.ALIYUN_SMS_ENDPOINT || 'dysmsapi.aliyuncs.com',
      signName: process.env.ALIYUN_SMS_SIGN_NAME || '速通互联验证码',
      // 🔒 短信模板配置已注释，当前短信发送功能已关闭
      // 需要时取消注释并配置正确的模板ID即可恢复
      // templates: {
      //   register: process.env.ALIYUN_SMS_TEMPLATE_REGISTER || '',
      //   login: process.env.ALIYUN_SMS_TEMPLATE_LOGIN || '',
      //   change_phone: process.env.ALIYUN_SMS_TEMPLATE_CHANGE_PHONE || '',
      //   reset_password: process.env.ALIYUN_SMS_TEMPLATE_RESET_PASSWORD || '',
      // },
    },
  },
});
