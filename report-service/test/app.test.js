import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

const KEY = 'test-internal-key-123';
const app = createApp({ internalKey: KEY });

test('GET /health отвечает 200', async () => {
  const res = await request(app).get('/health').expect(200);
  assert.equal(res.body.status, 'ok');
});

test('POST /summary без ключа или с чужим ключом - 401', async () => {
  await request(app).post('/summary').send({ facts: [] }).expect(401);
  await request(app).post('/summary').set('X-Internal-Key', 'wrong-key').send({ facts: [] }).expect(401);
});

test('POST /summary с верным ключом считает сводку', async () => {
  const res = await request(app)
    .post('/summary')
    .set('X-Internal-Key', KEY)
    .send({ facts: [{ group: 'A', value: 8 }, { group: 'A', value: 6 }] })
    .expect(200);
  assert.deepEqual(res.body.items, [{ group: 'A', count: 2, total: 14, average: 7 }]);
});

test('POST /summary с неверными данными - 400 в едином формате ошибки', async () => {
  const res = await request(app)
    .post('/summary')
    .set('X-Internal-Key', KEY)
    .send({ facts: [{ group: 'A', value: 'много' }] })
    .expect(400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('битый JSON - 400, а не 500', async () => {
  const res = await request(app)
    .post('/summary')
    .set('X-Internal-Key', KEY)
    .set('Content-Type', 'application/json')
    .send('{"facts": [')
    .expect(400);
  assert.equal(res.body.error.code, 'BAD_JSON');
});
