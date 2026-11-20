import { CacheService } from '../../src/cache/cache.service';
import { api, auth, clearDatabase, createCourseWithStudent, createTestApp, registerStudent, TestContext } from '../helpers/test-app';

describe('Кеш карточки курса (HTTP + тестовая MongoDB)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await clearDatabase(ctx.connection);
    ctx.app.get(CacheService).clear();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('MISS -> HIT, после изменения сразу актуальные данные', async () => {
    const f = await createCourseWithStudent(ctx);
    const url = `/api/v1/courses/${f.courseId}`;

    const cold = await api(ctx).get(url).set(auth(f.teacher.token)).expect(200);
    const warm = await api(ctx).get(url).set(auth(f.teacher.token)).expect(200);
    expect(cold.headers['x-cache']).toBe('MISS');
    expect(warm.headers['x-cache']).toBe('HIT');

    await api(ctx)
      .patch(url)
      .set(auth(f.teacher.token))
      .send({ title: 'Новое название', version: warm.body.version })
      .expect(200);

    const fresh = await api(ctx).get(url).set(auth(f.teacher.token)).expect(200);
    expect(fresh.headers['x-cache']).toBe('MISS');
    expect(fresh.body).toMatchObject({ title: 'Новое название', version: 2 });
  });

  it('доступ не кешируется: теплый кеш не открывает курс постороннему и отчисленному', async () => {
    const f = await createCourseWithStudent(ctx);
    const url = `/api/v1/courses/${f.courseId}`;
    await api(ctx).get(url).set(auth(f.teacher.token)).expect(200); // кеш прогрет

    const outsider = await registerStudent(ctx, 'outsider@test.local');
    await api(ctx).get(url).set(auth(outsider.token)).expect(404);

    const studentView = await api(ctx).get(url).set(auth(f.student.token)).expect(200);
    expect(studentView.headers['x-cache']).toBe('HIT');
    expect(studentView.body.studentsCount).toBeNull(); // число студентов - только владельцу

    const enrollments = await api(ctx).get(`${url}/enrollments`).set(auth(f.teacher.token)).expect(200);
    await api(ctx)
      .post(`${url}/enrollments/${enrollments.body.items[0].id}/remove`)
      .set(auth(f.teacher.token))
      .send({ reason: 'Проверка кеша' })
      .expect(200);
    await api(ctx).get(url).set(auth(f.student.token)).expect(404);
  });

  it('два одновременных изменения курса: одно проходит, второе 409, кеш показывает победителя', async () => {
    const f = await createCourseWithStudent(ctx);
    const url = `/api/v1/courses/${f.courseId}`;

    const [a, b] = await Promise.all([
      api(ctx).patch(url).set(auth(f.teacher.token)).send({ title: 'Вариант А', version: 1 }),
      api(ctx).patch(url).set(auth(f.teacher.token)).send({ title: 'Вариант Б', version: 1 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? 'Вариант А' : 'Вариант Б';

    const read = await api(ctx).get(url).set(auth(f.teacher.token)).expect(200);
    expect(read.body).toMatchObject({ title: winner, version: 2 });
  });
});
