import { aliyunConfig } from './aliyun.config';

export const configuration = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  return {
    // 环境信息
    nodeEnv,
    isDevelopment,
    isProduction,
    isTest,

    // 服务器配置
    port: parseInt(process.env.PORT!, 10) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',

    // 数据库配置
    database: {
      url: process.env.DATABASE_URL,
    },

    // JWT 配置
    jwt: {
      secret: process.env.JWT_SECRET || 'change-me-in-production',
      expiresIn: process.env.JWT_EXPIRATION || '7d',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-in-production',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
    },

    // 限流配置
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL!, 10) || 60,
      limit: parseInt(process.env.THROTTLE_LIMIT!, 10) || (isDevelopment ? 100 : 10),
    },

    // 日志配置
    logging: {
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      dir: process.env.LOG_DIR || 'logs',
    },

    // CORS 配置
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    },

    // 加密配置
    encryption: {
      key: process.env.ENCRYPTION_KEY || 'change-me-encryption-key-32-chars',
    },

    // 调试配置
    debug: {
      enableApiDocs: process.env.ENABLE_API_DOCS === 'true' || isDevelopment,
      enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true' || isDevelopment,
    },

    // 阿里云配置（从独立配置文件引入）
    ...aliyunConfig(),
  };
};
