import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, raw, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SerializeInterceptor } from './common/interceptors/serialize.interceptor';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  dotenv.config();
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.split('?')[0] === '/api/v1/payments/webhook') {
      return raw({ type: 'application/json' })(req, res, next);
    }
    return json()(req, res, next);
  });
  app.useGlobalInterceptors(new SerializeInterceptor());
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://my-ecommerce-website-1w02w5xgi-ali-naseems-projects-305588ff.vercel.app',
      'https://my-ecommerce-website-idnqoq0q1-ali-naseems-projects-305588ff.vercel.app',
      'https://my-ecommerce-website-three.vercel.app',
      'https://chatbot-gateway.onrender.com',
    ],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription('The API documentation for the E-Commerce backend')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('products', 'Product catalog')
    .addTag('cart', 'Shopping cart management')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger UI available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
