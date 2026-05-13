import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet, { type FastifyHelmetOptions } from '@fastify/helmet';
import cookie, { type FastifyCookieOptions } from '@fastify/cookie';
import cors, { type FastifyCorsOptions } from '@fastify/cors';
import type { FastifyPluginAsync, FastifyPluginCallback } from 'fastify';

import { env } from '@yorecebimde/config/api';
import { createLogger } from '@yorecebimde/shared';
import { AppModule } from './app.module.js';
import { RealtimeService } from './modules/realtime/realtime.service.js';
import { initSentry } from './instrumentation/sentry.js';

const logger = createLogger({
  level: env.LOG_LEVEL,
  pretty: env.LOG_PRETTY,
  service: 'yorecebimde-api',
});

async function bootstrap() {
  logger.info('boot[0] init sentry');
  await initSentry();

  logger.info('boot[1] creating adapter');
  const adapter = new FastifyAdapter({
    logger: false,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024,
    disableRequestLogging: true,
  });

  logger.info('boot[2] NestFactory.create');
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  logger.info('boot[3] register helmet');
  // Faz 7 — production CSP + HSTS. Dev'de CSP gevşek (Next.js HMR scripts).
  const isProd = env.NODE_ENV === 'production';
  await app.register(helmet as FastifyPluginAsync<FastifyHelmetOptions>, {
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            connectSrc: ["'self'", 'https:', 'wss:'],
            fontSrc: ["'self'", 'data:'],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    hsts: isProd
      ? {
          maxAge: 63072000, // 2 yıl
          includeSubDomains: true,
          preload: true,
        }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xFrameOptions: { action: 'deny' },
    xContentTypeOptions: true,
    xDownloadOptions: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  });

  logger.info('boot[4] register cookie');
  await app.register(cookie as FastifyPluginCallback<FastifyCookieOptions>, {
    secret: env.BETTER_AUTH_SECRET,
  });

  logger.info('boot[5] register cors');
  const allowedOrigins = [env.BETTER_AUTH_URL, ...env.CORS_EXTRA_ORIGINS];
  await app.register(cors as FastifyPluginCallback<FastifyCorsOptions>, {
    origin: env.NODE_ENV === 'production' ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Accept-Language'],
  });

  logger.info('boot[6] setGlobalPrefix');
  app.setGlobalPrefix('v1', { exclude: ['healthz', 'readyz', 'metrics', '/api/auth/(.*)'] });

  // Swagger UI — dev + staging'de açık, prod'da kapalı.
  if (env.NODE_ENV !== 'production') {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Yörecebimde API')
      .setDescription(
        'Yöresel ürün marketplace API. v1 endpoint\'leri — auth, products, cart, orders, sellers, admin, bot, vs.',
      )
      .setVersion('1.0.0')
      .addCookieAuth('yorecebimde.session_token', {
        type: 'apiKey',
        in: 'cookie',
      })
      .addTag('users', 'Kullanıcı profili')
      .addTag('products', 'Ürün listeleme + detay')
      .addTag('cart', 'Sepet operasyonları')
      .addTag('orders', 'Sipariş yönetimi')
      .addTag('sellers', 'Satıcı operasyonları')
      .addTag('admin', 'Super admin paneli')
      .addTag('bot', 'AI bot endpoint\'leri')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('v1/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.info('Swagger UI mounted at /v1/docs');
  }

  logger.info('boot[7] attach realtime WebSocket gateway');
  const realtime = app.get(RealtimeService);
  // Fastify altındaki native HTTP server'a upgrade handler bağla
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const httpServer = (adapter.getInstance() as any).server as import('node:http').Server;
  realtime.attachToHttpServer(httpServer);

  logger.info('boot[8] listen');
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });

  logger.info(`🚀 Yörecebimde API listening on http://localhost:${port}`);
  if (env.NODE_ENV !== 'production') {
    logger.info(`📖 Swagger UI: http://localhost:${port}/v1/docs`);
  }
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start API');
  process.exit(1);
});
