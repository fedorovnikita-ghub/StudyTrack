import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { config } from './config';
import { setupSwagger } from './swagger.setup';

async function bootstrap() {
  // Express-адаптер выбран явно, как требует ТЗ
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bodyParser: false,
  });
  configureApp(app);
  setupSwagger(app); // документация: http://localhost:4000/api/docs

  // При остановке (Ctrl+C) Nest закроет соединение с MongoDB и сервер
  app.enableShutdownHooks();

  await app.listen(config.port);
  Logger.log(`API запущен: http://localhost:${config.port}/api/v1`, 'Bootstrap');
  Logger.log(`Документация OpenAPI: http://localhost:${config.port}/api/docs`, 'Bootstrap');
}

process.on('unhandledRejection', (reason) => {
  Logger.error(`Необработанная ошибка Promise: ${String(reason)}`, undefined, 'Process');
});

bootstrap().catch((err: unknown) => {
  Logger.error(`Не удалось запустить API: ${err instanceof Error ? err.message : String(err)}`, undefined, 'Bootstrap');
  process.exit(1);
});
