import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { config } from '../../src/config';
import { api, auth, clearDatabase, createCourseWithStudent, createTestApp, TestContext } from '../helpers/test-app';

const STUB_KEY = 'stub-internal-key-123456';

// Заглушка report-service: проверяет ключ и считает сводку так же, как настоящий сервис.
// Она доказывает контракт со стороны основного API, но не сам сервис - его проверяют тесты в report-service/test
function startStub(): Promise<{ server: Server; url: string; received: unknown[] }> {
  const received: unknown[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (req.headers['x-internal-key'] !== STUB_KEY) {
        res.writeHead(401).end();
        return;
      }
      const { facts } = JSON.parse(body) as { facts: { group: string; value: number }[] };
      received.push(...facts);
      const groups = new Map<string, { count: number; total: number }>();
      for (const f of facts) {
        const g = groups.get(f.group) ?? { count: 0, total: 0 };
        g.count += 1;
        g.total += f.value;
        groups.set(f.group, g);
      }
      const items = [...groups].map(([group, g]) => ({ group, count: g.count, total: g.total, average: g.total / g.count }));
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ items }));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}`, received });
    });
  });
}

describe('Отчеты, CSV и report-service (HTTP + тестовая MongoDB)', () => {
  let ctx: TestContext;
  const original = { ...config.reportService };

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });
  afterEach(() => {
    Object.assign(config.reportService, original);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  async function courseWithGrade() {
    const f = await createCourseWithStudent(ctx);
    const sub = await api(ctx)
      .post(`/api/v1/assignments/${f.assignmentId}/submissions`)
      .set(auth(f.student.token))
      .send({ text: 'Работа для отчета' })
      .expect(201);
    await api(ctx)
      .post(`/api/v1/submissions/${sub.body.id}/grade`)
      .set(auth(f.teacher.token))
      .send({ score: 70, version: 1 })
      .expect(200);
    return f;
  }

  it('отчет курса считает сдачи и средний результат, студенту недоступен', async () => {
    const f = await courseWithGrade();
    const res = await api(ctx).get(`/api/v1/courses/${f.courseId}/report`).set(auth(f.teacher.token)).expect(200);
    expect(res.body.totals).toMatchObject({ assignments: 1, enrolled: 1, submitted: 1, onTime: 1, averagePercent: 70 });
    expect(res.body.students[0]).toMatchObject({ totalScore: 70, maxTotal: 100 });

    await api(ctx).get(`/api/v1/courses/${f.courseId}/report`).set(auth(f.student.token)).expect(403);
    const longPeriod = await api(ctx)
      .get(`/api/v1/courses/${f.courseId}/report?from=2026-01-01&to=2026-06-01`)
      .set(auth(f.teacher.token))
      .expect(400);
    expect(longPeriod.body.error.fields.to).toBeDefined();
  });

  it('report-service работает: средние приходят от сервиса, ему уходят только обезличенные факты', async () => {
    const f = await courseWithGrade();
    const stub = await startStub();
    try {
      Object.assign(config.reportService, { url: stub.url, key: STUB_KEY });
      const res = await api(ctx)
        .get(`/api/v1/courses/${f.courseId}/report/summary`)
        .set(auth(f.teacher.token))
        .expect(200);
      expect(res.body.items[0]).toMatchObject({ count: 1, total: 70, average: 70, averagePercent: 70 });
      // В факте только group и value: ни id студента, ни текста работы
      expect(stub.received).toEqual([{ group: f.assignmentId, value: 70 }]);
    } finally {
      stub.server.close();
    }
  });

  it('report-service остановлен: 503 только для этого отчета, основные операции работают', async () => {
    const f = await courseWithGrade();
    Object.assign(config.reportService, { url: 'http://127.0.0.1:9', key: STUB_KEY }); // на этом порту никого нет

    const res = await api(ctx)
      .get(`/api/v1/courses/${f.courseId}/report/summary`)
      .set(auth(f.teacher.token))
      .expect(503);
    expect(res.body.error.code).toBe('REPORT_SERVICE_UNAVAILABLE');

    // Остальное работает: основной отчет и сдача новой версии
    await api(ctx).get(`/api/v1/courses/${f.courseId}/report`).set(auth(f.teacher.token)).expect(200);
    await api(ctx)
      .post(`/api/v1/assignments/${f.assignmentId}/submissions`)
      .set(auth(f.student.token))
      .send({ text: 'Новая версия при остановленном сервисе' })
      .expect(201);
  });

  it('CSV: проверка прав и периода до заголовков, данные экранированы', async () => {
    const f = await courseWithGrade();
    // Имя студента, похожее на формулу
    await ctx.connection.collection('users').updateOne({ role: 'student' }, { $set: { displayName: '=1+1' } });

    const res = await api(ctx)
      .get(`/api/v1/reports/export.csv?courseId=${f.courseId}`)
      .set(auth(f.teacher.token))
      .expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.replace(/^﻿/, '').trim().split('\r\n');
    expect(lines[0]).toContain('Студент');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("'=1+1");
    expect(lines[1]).toContain(';70;100');

    // Ошибки до начала потока приходят обычным JSON
    const bad = await api(ctx)
      .get(`/api/v1/reports/export.csv?courseId=${f.courseId}&from=2026-01-01&to=2026-12-31`)
      .set(auth(f.teacher.token))
      .expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    await api(ctx).get(`/api/v1/reports/export.csv?courseId=${f.courseId}`).set(auth(f.student.token)).expect(403);
  });
});
