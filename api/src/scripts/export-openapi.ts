// Выгрузка OpenAPI в docs/openapi.json для сдачи.
//   npm run openapi:export
// Запускается из собранной версии (nest build), потому что описание полей DTO
// добавляет плагин @nestjs/swagger во время сборки. Нужен доступ к базе из api/.env
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { buildOpenApiDocument } from '../swagger.setup';

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bodyParser: false,
    logger: ['error', 'warn'],
  });
  configureApp(app);
  await app.init();

  const document = buildOpenApiDocument(app);
  const dir = join(process.cwd(), '..', 'docs');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'openapi.json'), JSON.stringify(document, null, 2), 'utf8');
  console.log(`Записано: docs/openapi.json (маршрутов: ${Object.keys(document.paths).length})`);

  await app.close();
}

main().catch((err: unknown) => {
  console.error(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
