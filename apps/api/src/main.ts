import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AppModule } from './app.module';

// 未设置 JWT 时自动生成，避免部署时必须填一堆变量（重启后 token 会失效，仅适合试跑）
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = randomBytes(32).toString('hex');
  console.warn('[API] JWT_ACCESS_SECRET 未设置，已自动生成（重启后登录会失效）');
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = randomBytes(32).toString('hex');
  console.warn('[API] JWT_REFRESH_SECRET 未设置，已自动生成');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
      : true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  const dbUrl = process.env.DATABASE_URL || '';
  const dbHint = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@').replace(/\?.*$/, '') : '(未设置)';
  console.log(`API running at http://localhost:${port} | DB: ${dbHint}`);
}

bootstrap();
