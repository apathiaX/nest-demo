import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    bodyParser: true, // 启用内置的 body parser
  });

  const configService = app.get(ConfigService);

  // 配置 body parser 大小限制（支持 JSON、URL-encoded 和 FormData）
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  // Security
  app.use(helmet());

  // Cookie Parser - 必须在 CORS 之前启用
  app.use(cookieParser());

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(','),
    credentials: true, // 允许携带 cookie
  });

  // API Prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  const port = configService.get<number>('port', 3000);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');

  // Swagger Documentation - 根据环境配置决定是否启用
  const enableApiDocs = configService.get<boolean>('debug.enableApiDocs', true);
  if (enableApiDocs) {
    const config = new DocumentBuilder()
      .setTitle('Habit & Challenge API')
      .setDescription('Enterprise-level Habit & Challenge Planning Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Plans', 'Plan management endpoints')
      .addTag('Tasks', 'Task management endpoints')
      .addTag('Records', 'Task record endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    console.log(`📚 API Documentation enabled at: http://localhost:${port}/api/docs`);
  } else {
    console.log('📚 API Documentation is disabled in production');
  }

  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🚀 Habit & Challenge Platform Backend                       ║
╠═══════════════════════════════════════════════════════════════╣
║  📡 Server:        http://localhost:${port.toString().padEnd(28)} ║
║  🔧 Environment:   ${nodeEnv.padEnd(42)} ║
║  📝 API Prefix:    /${configService.get<string>('apiPrefix', 'api/v1').padEnd(41)} ║
║  📚 API Docs:      ${enableApiDocs ? `http://localhost:${port}/api/docs` : 'Disabled'.padEnd(28)} ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
