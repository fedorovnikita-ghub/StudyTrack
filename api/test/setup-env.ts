// Выполняется перед каждым файлом тестов, до импорта приложения.
// Подменяет рабочую базу на тестовую и не дает случайно очистить рабочую
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Jest дает каждому файлу тестов свою копию process.env, а process.loadEnvFile()
// пишет в окружение самого процесса. Поэтому .env разбираем сами и кладем значения
// прямо в process.env теста (уже заданные переменные не перезаписываем)
if (existsSync('.env')) {
  const values = parseEnv(readFileSync('.env', 'utf8'));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined && value !== undefined) {
      process.env[key] = value;
    }
  }
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
