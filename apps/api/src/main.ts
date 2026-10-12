import 'dotenv/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* =======================================================
     FRONTEND URL

     Local:
     http://localhost:3000

     Render:
     https://your-frontend.onrender.com
  ======================================================= */

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  /* =======================================================
     CORS
  ======================================================= */

  app.enableCors({
    origin: frontendUrl,

    credentials: true,
  });

  /* =======================================================
     GLOBAL API PREFIX
  ======================================================= */

  app.setGlobalPrefix('api/v1');

  app.useBodyParser('json', { limit: '5mb' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  /* =======================================================
     PORT

     Local:
     4000

     Render:
     Render automatically provides PORT
  ======================================================= */

  const port = Number(process.env.PORT ?? 4000);

  /* =======================================================
     START SERVER

     0.0.0.0 is important for deployment.
  ======================================================= */

  await app.listen(port);

  /* =======================================================
     LOG
  ======================================================= */

  console.log(`API running on port ${port}`);

  console.log(`API base path: /api/v1`);

  console.log(`Allowed frontend: ${frontendUrl}`);
}

bootstrap();
