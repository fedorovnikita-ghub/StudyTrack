import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { bodyParserErrorHandler } from './common/body-parser-error';
import { createValidationPipe } from './common/validation';
import { config } from './config';

async function bootstrap() {
  // Express-адаптер выбран явно, как требует ТЗ
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bodyParser: false,
  });

  app.disable('x-powered-by');
  app.use(json({ limit: '100kb' }));
  app.use(bodyParserErrorHandler);

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.webOrigins });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  // При остановке (Ctrl+C) Nest закроет соединение с MongoDB и сервер
  app.enableShutdownHooks();

  await app.listen(config.port);
  Logger.log(`API запущен: http://localhost:${config.port}/api/v1`, 'Bootstrap');
}

process.on('unhandledRejection', (reason) => {
  Logger.error(`Необработанная ошибка Promise: ${String(reason)}`, undefined, 'Process');
});

bootstrap().catch((err: unknown) => {
  Logger.error(`Не удалось запустить API: ${err instanceof Error ? err.message : String(err)}`, undefined, 'Bootstrap');
  process.exit(1);
});
