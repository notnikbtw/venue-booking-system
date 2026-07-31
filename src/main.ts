import { readFileSync } from 'fs';
import { join } from 'path';

import { GlobalExceptionFilter } from '@common/filters/globalExceptionFilter';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  app.useStaticAssets(
    join(__dirname, '..', process.env.UPLOADS_PATH ?? 'uploads'),
    {
      prefix: '/uploads',
    }
  );

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
  );

  const config = new DocumentBuilder()
    .setTitle('Venue Booking System API')
    .setDescription(
      'API documentation for the Venue Booking System backend application.'
    )
    .setVersion(packageJson.version)
    .addBearerAuth()
    .build();

  app.getHttpAdapter().get('/', (req, res) => {});

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}

bootstrap();
