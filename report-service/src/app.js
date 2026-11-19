import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import { MAX_FACTS, summarize, validateFacts } from './summary.js';

function error(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

// Сравнение ключей за постоянное время
function sameKey(received, expected) {
  if (typeof received !== 'string') return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Express-приложение сервиса. Ключ передается снаружи, чтобы тесты могли задать свой
export function createApp({ internalKey }) {
  const app = express();
  app.disable('x-powered-by');
  // CORS-заголовков нет намеренно: браузер не может вызвать сервис напрямую
  app.use(express.json({ limit: '1mb' }));

  // GET /health - жив ли сервис
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'report-service' });
  });

  // POST /summary - сводка { group, count, total, average } по обезличенным фактам
  app.post('/summary', (req, res) => {
    if (!sameKey(req.get('X-Internal-Key'), internalKey)) {
      error(res, 401, 'INVALID_INTERNAL_KEY', 'Неверный внутренний ключ');
      return;
    }
    const problem = validateFacts(req.body);
    if (problem) {
      error(res, 400, 'VALIDATION_ERROR', problem);
      return;
    }
    res.json({ items: summarize(req.body.facts), factsCount: req.body.facts.length, maxFacts: MAX_FACTS });
  });

  app.use((_req, res) => {
    error(res, 404, 'NOT_FOUND', 'Маршрут не найден');
  });

  // Ошибки разбора JSON и прочие: без технического стека в ответе
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') {
      error(res, 413, 'PAYLOAD_TOO_LARGE', 'Слишком большой запрос');
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      error(res, 400, 'BAD_JSON', 'Тело запроса не является корректным JSON');
      return;
    }
    console.error('[report-service] Неожиданная ошибка:', err);
    error(res, 500, 'INTERNAL_ERROR', 'Внутренняя ошибка сервиса');
  });

  return app;
}
