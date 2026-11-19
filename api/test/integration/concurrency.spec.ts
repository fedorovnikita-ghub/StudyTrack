import { Types } from 'mongoose';
import { api, auth, clearDatabase, createCourseWithStudent, createTestApp, registerStudent, TestContext } from '../helpers/test-app';

// Эксперимент одновременных команд: проверяются итоговые документы, а не только HTTP-коды
describe('Одновременные команды (HTTP + тестовая MongoDB)', () => {
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

  it('5 одновременных сдач одного студента получают номера 1..5 без повторов', async () => {
    const f = await createCourseWithStudent(ctx);
    const submitUrl = `/api/v1/assignments/${f.assignmentId}/submissions`;

    const responses = await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        api(ctx).post(submitUrl).set(auth(f.student.token)).send({ text: `Параллельная версия ${i}` }),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);

    const stored = await ctx.connection
      .collection('submissions')
      .find({ assignmentId: new Types.ObjectId(f.assignmentId) })
      .toArray();
    expect(stored.map((s) => s.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);

    // guardVersion зачисления увеличился ровно на число сдач
    const enrollment = await ctx.connection.collection('enrollments').findOne({ status: 'active' });
    expect(enrollment?.guardVersion).toBe(5);
  });

  it('две одновременные оценки одной версии: одна проходит, вторая получает 409, оценка одна', async () => {
    const f = await createCourseWithStudent(ctx);
    const sub = await api(ctx)
      .post(`/api/v1/assignments/${f.assignmentId}/submissions`)
      .set(auth(f.student.token))
      .send({ text: 'Работа' })
      .expect(201);
    const gradeUrl = `/api/v1/submissions/${sub.body.id}/grade`;

    const [a, b] = await Promise.all([
      api(ctx).post(gradeUrl).set(auth(f.teacher.token)).send({ score: 60, version: 1 }),
      api(ctx).post(gradeUrl).set(auth(f.teacher.token)).send({ score: 90, version: 1 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);

    const grades = await ctx.connection.collection('grades').find().toArray();
    expect(grades).toHaveLength(1);
    const stored = await ctx.connection.collection('submissions').findOne({ _id: new Types.ObjectId(sub.body.id as string) });
    expect(stored?.version).toBe(2);
    expect(stored?.currentGrade.score).toBe(grades[0].score);
  });

  it('два одновременных зачисления одного студента: одно действующее зачисление', async () => {
    const f = await createCourseWithStudent(ctx);
    const newcomer = await registerStudent(ctx, 'newcomer@test.local');
    const url = `/api/v1/courses/${f.courseId}/enrollments`;

    const [a, b] = await Promise.all([
      api(ctx).post(url).set(auth(f.teacher.token)).send({ email: newcomer.email }),
      api(ctx).post(url).set(auth(f.teacher.token)).send({ email: newcomer.email }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);

    const count = await ctx.connection
      .collection('enrollments')
      .countDocuments({ studentId: new Types.ObjectId(newcomer.id), status: 'active' });
    expect(count).toBe(1);
  });
});
