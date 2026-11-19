import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { json } from 'express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { bodyParserErrorHandler } from './common/body-parser-error';
import { createValidationPipe } from './common/validation';
import { config } from './config';

// Общая настройка приложения. Используется и в main.ts, и в интеграционных тестах,
// чтобы тесты проверяли то же поведение, что и рабочий сервер
export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  app.use(json({ limit: '100kb' }));
  app.use(bodyParserErrorHandler);

  app.setGlobalPrefix('api/v1');
  // Content-Disposition открыт браузеру, чтобы сайт узнал имя скачиваемого CSV
  app.enableCors({ origin: config.webOrigins, exposedHeaders: ['Content-Disposition'] });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Socket.IO работает на том же HTTP-сервере, что и REST
  app.useWebSocketAdapter(new IoAdapter(app));
}
