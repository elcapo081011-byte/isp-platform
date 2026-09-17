import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Cabeceras de seguridad HTTP estándar (punto 28).
  app.use(helmet());

  // Nunca exponer errores técnicos crudos al cliente (punto 36).
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validación y sanitización de entrada en todos los endpoints (punto 28).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('ISP Management Platform API')
    .setDescription('API REST documentada — plataforma de administración de ISP')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  console.log(`🚀 API lista en http://localhost:${port}/api/v1`);
  console.log(`📄 Swagger en http://localhost:${port}/api/docs`);
}

bootstrap();
