import { Types } from 'mongoose';
import { api, auth, clearDatabase, createCourseWithStudent, createTestApp, TestContext } from '../helpers/test-app';

describe('Основной процесс: сдача и оценивание (HTTP + тестовая MongoDB)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('две версии, оценка конкретной версии и текущий результат по последней оцененной', async () => {
    const f = await createCourseWithStudent(ctx);
    const submitUrl = `/api/v1/assignments/${f.assignmentId}/submissions`;

    const v1 = await api(ctx).post(submitUrl).set(auth(f.student.token)).send({ text: 'Первая версия' }).expect(201);
    const v2 = await api(ctx).post(submitUrl).set(auth(f.student.token)).send({ text: 'Вторая версия' }).expect(201);
    expect(v1.body).toMatchObject({ number: 1, isLate: false, status: 'submitted' });
    expect(v2.body.number).toBe(2);

    // Оцениваем только первую версию: результат 50 по версии 1, хотя есть неоцененная версия 2
    await api(ctx)
      .post(`/api/v1/submissions/${v1.body.id}/grade`)
      .set(auth(f.teacher.token))
      .send({ score: 50, comment: 'Неплохо', version: v1.body.version })
      .expect(200);

    let results = await api(ctx).get('/api/v1/results/my').set(auth(f.student.token)).expect(200);
    expect(results.body.items[0].assignments[0]).toMatchObject({ currentScore: 50, gradedVersion: 1, versionsCount: 2 });

    // Оценка второй версии становится текущей, история первой сохраняется
    await api(ctx)
      .post(`/api/v1/submissions/${v2.body.id}/grade`)
      .set(auth(f.teacher.token))
      .send({ score: 80, version: v2.body.version })
      .expect(200);

    results = await api(ctx).get('/api/v1/results/my').set(auth(f.student.token)).expect(200);
    expect(results.body.items[0]).toMatchObject({ totalScore: 80, maxTotal: 100 });
    expect(results.body.items[0].assignments[0]).toMatchObject({ currentScore: 80, gradedVersion: 2 });

    // Документы в базе согласованы: 2 версии, 2 оценки, дата оценки совпадает в обоих местах
    const grades = ctx.connection.collection('grades');
    expect(await grades.countDocuments()).toBe(2);
    const stored = await ctx.connection
      .collection('submissions')
      .findOne({ _id: new Types.ObjectId(v1.body.id as string) });
    const grade = await grades.findOne({ submissionId: new Types.ObjectId(v1.body.id as string) });
    expect(stored?.status).toBe('graded');
    expect(stored?.version).toBe(2);
    expect(stored?.currentGrade.score).toBe(50);
    expect(stored?.currentGrade.gradedAt.getTime()).toBe(grade?.gradedAt.getTime());
  });

  it('неверный ввод: ошибки полей и ни одной новой записи', async () => {
    const f = await createCourseWithStudent(ctx, { minTextLength: 20 });
    const submitUrl = `/api/v1/assignments/${f.assignmentId}/submissions`;

    const short = await api(ctx).post(submitUrl).set(auth(f.student.token)).send({ text: 'коротко' }).expect(400);
    expect(short.body.error.fields.text).toBeDefined();

    const withNumber = await api(ctx)
      .post(submitUrl)
      .set(auth(f.student.token))
      .send({ text: 'Достаточно длинный текст работы', number: 1 })
      .expect(400);
    expect(withNumber.body.error.fields.number).toBe('Неизвестное поле');
    expect(await ctx.connection.collection('submissions').countDocuments()).toBe(0);

    const badDate = await api(ctx)
      .post(`/api/v1/courses/${f.courseId}/assignments`)
      .set(auth(f.teacher.token))
      .send({ title: 'Задание', text: 'Текст', dueAt: '2030-12-01T23:59:00', maxScore: 10 })
      .expect(400);
    expect(badDate.body.error.fields.dueAt).toBeDefined();
    expect(await ctx.connection.collection('assignments').countDocuments()).toBe(1); // только из fixture
  });

  it('балл вне диапазона и устаревшая version оценки отклоняются без записи', async () => {
    const f = await createCourseWithStudent(ctx);
    const sub = await api(ctx)
      .post(`/api/v1/assignments/${f.assignmentId}/submissions`)
      .set(auth(f.student.token))
      .send({ text: 'Работа' })
      .expect(201);
    const gradeUrl = `/api/v1/submissions/${sub.body.id}/grade`;

    const tooHigh = await api(ctx)
      .post(gradeUrl)
      .set(auth(f.teacher.token))
      .send({ score: 101, version: 1 })
      .expect(400);
    expect(tooHigh.body.error.fields.score).toBeDefined();

    await api(ctx).post(gradeUrl).set(auth(f.teacher.token)).send({ score: 70, version: 1 }).expect(200);
    const stale = await api(ctx).post(gradeUrl).set(auth(f.teacher.token)).send({ score: 99, version: 1 }).expect(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');

    const grades = await ctx.connection.collection('grades').find().toArray();
    expect(grades).toHaveLength(1);
    expect(grades[0].score).toBe(70);
  });

  it('просроченная сдача помечается явно, предел версий соблюдается', async () => {
    const f = await createCourseWithStudent(ctx, { maxVersions: 1 });
    // Переносим срок в прошлое напрямую в базе (через API срок в прошлом задать нельзя)
    await ctx.connection
      .collection('assignments')
      .updateOne({ _id: new Types.ObjectId(f.assignmentId) }, { $set: { dueAt: new Date(Date.now() - 60_000) } });

    const submitUrl = `/api/v1/assignments/${f.assignmentId}/submissions`;
    const late = await api(ctx).post(submitUrl).set(auth(f.student.token)).send({ text: 'Поздно' }).expect(201);
    expect(late.body.isLate).toBe(true);

    const over = await api(ctx).post(submitUrl).set(auth(f.student.token)).send({ text: 'Еще раз' }).expect(409);
    expect(over.body.error.code).toBe('MAX_VERSIONS_REACHED');
    expect(await ctx.connection.collection('submissions').countDocuments()).toBe(1);
  });
});
