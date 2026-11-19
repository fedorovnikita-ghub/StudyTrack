import { NestExpressApplication } from '@nestjs/platform-express';
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
  app.enableCors({ origin: config.webOrigins });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
}
