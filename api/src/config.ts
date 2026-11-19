import { existsSync } from 'node:fs';

// .env читаем встроенной функцией Node. Переменные, уже заданные в системе, не перезаписываются
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name}. Пример есть в api/.env.example`);
  }
  return value;
}

function secret(name: string, minLength: number): string {
  const value = required(name);
  if (value.length < minLength) {
    throw new Error(`Переменная ${name} должна быть не короче ${minLength} символов`);
  }
  return value;
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Переменная ${name} должна быть положительным целым числом`);
  }
  return value;
}

function list(name: string, fallback: string): string[] {
  const raw = process.env[name]?.trim() || fallback;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: positiveInt('PORT', 4000),
  mongodbUri: required('MONGODB_URI'),
  webOrigins: list('WEB_ORIGIN', 'http://localhost:3000'),
  jwtSecret: secret('JWT_SECRET', 32),
  jwtExpiresInSec: 60 * 60, // токен живет 60 минут, как в ТЗ
  // Отдельный сервис отчетов. Без ключа основной API работает, а отчет "средние баллы" отвечает 503
  reportService: {
    url: (process.env.REPORT_SERVICE_URL?.trim() || 'http://127.0.0.1:4100').replace(/\/+$/, ''),
    key: process.env.REPORT_SERVICE_KEY?.trim() || '',
    timeoutMs: 3000,
  },
};
