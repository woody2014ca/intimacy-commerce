import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

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
