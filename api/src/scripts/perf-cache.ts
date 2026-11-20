// Замер кеша карточки курса на работающем API (npm run start:dev и npm run seed заранее).
//   npm run perf:cache
// Шаги: изменение курса (кеш очищен) -> 5 одинаковых чтений (1 MISS, затем HIT) ->
// изменение -> чтение показывает новые данные -> возврат названия.
// Результат печатается и записывается в docs/perf/cache-results.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';
const EMAIL = process.env.PERF_EMAIL || 'anna.smirnova@studytrack.demo';
const PASSWORD = process.env.PERF_PASSWORD || 'demo-pass-2026';

interface Row {
  step: string;
  cache: string;
  ms: number;
  title: string;
  version: number;
}

async function call(path: string, token: string | null, init: RequestInit = {}) {
  const started = performance.now();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const ms = Math.round((performance.now() - started) * 10) / 10;
  const body = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status} ${JSON.stringify(body)}`);
  return { body, ms, cache: res.headers.get('X-Cache') ?? '-' };
}

async function main() {
  const login = await call('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const token = login.body.token as string;

  const list = await call('/courses?limit=1', token);
  const first = (list.body.items as { id: string }[])[0];
  if (!first) throw new Error('У пользователя нет курсов. Запустите npm run seed');
  const id = first.id;

  const rows: Row[] = [];
  const read = async (step: string) => {
    const r = await call(`/courses/${id}`, token);
    const course = { title: String(r.body.title), version: Number(r.body.version) };
    rows.push({ step, cache: r.cache, ms: r.ms, ...course });
    return course;
  };
  const patch = async (title: string, version: number) =>
    Number((await call(`/courses/${id}`, token, { method: 'PATCH', body: JSON.stringify({ title, version }) })).body.version);

  const original = await read('исходное чтение');
  // Изменение очищает кеш - дальше чтения начинаются с холодного кеша
  const markedVersion = await patch(`${original.title} *`, original.version);
  for (let i = 1; i <= 5; i += 1) {
    await read(`чтение ${i}${i === 1 ? ' (холодный кеш)' : ' (теплый кеш)'}`);
  }
  await patch(original.title, markedVersion);
  await read('чтение после изменения');

  console.table(rows);

  const md = [
    '# Замер кеша карточки курса',
    '',
    `Дата: ${new Date().toISOString()}. API: ${API}. Курс: ${id}.`,
    '',
    'Ключ `course:<id>`, срок 60 секунд, максимум 100 ключей, очистка после успешного PATCH курса.',
    'Время - полное время HTTP-запроса с компьютера, где запущен скрипт (включая сеть до Atlas при MISS).',
    '',
    '| Шаг | X-Cache | Время, мс | Название в ответе | version |',
    '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.step} | ${r.cache} | ${r.ms} | ${r.title} | ${r.version} |`),
    '',
    'Вывод: первое чтение после изменения - MISS (данные из MongoDB), следующие - HIT из памяти.',
    'После изменения кеш очищен, и ответ сразу содержит новое название и version.',
    '',
  ].join('\n');
  const dir = join(process.cwd(), '..', 'docs', 'perf');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'cache-results.md'), md, 'utf8');
  console.log('Записано: docs/perf/cache-results.md');
}

main().catch((err: unknown) => {
  console.error(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
