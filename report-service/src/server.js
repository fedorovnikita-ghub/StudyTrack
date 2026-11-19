import { existsSync } from 'node:fs';
import { createApp } from './app.js';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const port = Number(process.env.PORT || 4100);
const host = process.env.HOST || '127.0.0.1';
const internalKey = process.env.REPORT_SERVICE_KEY?.trim() ?? '';

if (internalKey.length < 16) {
  console.error('REPORT_SERVICE_KEY не задан или короче 16 символов. Пример в report-service/.env.example');
  process.exit(1);
}

const server = createApp({ internalKey }).listen(port, host, () => {
  console.log(`report-service запущен: http://${host}:${port}`);
});

// Корректная остановка: перестаем принимать соединения и выходим
function shutdown() {
  console.log('report-service останавливается...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
