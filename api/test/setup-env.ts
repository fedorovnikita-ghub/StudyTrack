// Выполняется перед каждым файлом тестов, до импорта приложения.
// Подменяет рабочую базу на тестовую и не дает случайно очистить рабочую
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

function databaseName(uri: string): string {
  try {
    return new URL(uri).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

const testUri = process.env.MONGODB_URI_TEST?.trim();
if (!testUri) {
  throw new Error('Для тестов задайте MONGODB_URI_TEST в api/.env (отдельная база, например studytrack_test)');
}
if (!databaseName(testUri).endsWith('_test')) {
  throw new Error('Имя базы в MONGODB_URI_TEST должно оканчиваться на _test: тесты очищают эту базу');
}

process.env.MONGODB_URI = testUri;
process.env.JWT_SECRET ||= 'test-only-jwt-secret-with-at-least-32-characters';
