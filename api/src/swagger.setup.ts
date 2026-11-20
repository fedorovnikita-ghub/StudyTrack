import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

// OpenAPI-описание REST API. Поля, обязательность и диапазоны входа берутся из DTO
// (плагин @nestjs/swagger в nest-cli.json читает class-validator), ответы и ошибки - из декораторов
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const options = new DocumentBuilder()
    .setTitle('StudyTrack API')
    .setDescription(
      'REST API учета учебных заданий и результатов. Все маршруты с префиксом /api/v1. ' +
        'Ошибки в едином формате { error: { code, message, fields? } }. ' +
        'Успех: 200, создание: 201, без тела: 204. Формат/валидация: 400, вход/роль/чужой объект: 401/403/404, ' +
        'состояние/уникальность/версия: 409, временно недоступная зависимость: 503. ' +
        'Списки: { items, page, limit, total }, по умолчанию page=1, limit=20, максимум 100.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Токен из /auth/login, живет 60 минут' })
    .build();
  return SwaggerModule.createDocument(app, options);
}

// Страница документации: /api/docs, JSON: /api/docs-json. Файлы Swagger UI раздаются локально из пакета
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app), {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'StudyTrack API',
  });
}
