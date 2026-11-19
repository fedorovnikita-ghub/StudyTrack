import {
  api,
  auth,
  clearDatabase,
  createCourseWithStudent,
  createTeacher,
  createTestApp,
  registerStudent,
  TestContext,
} from '../helpers/test-app';

describe('Права доступа (HTTP + тестовая MongoDB)', () => {
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

  it('без входа - 401, студент не может создать курс - 403', async () => {
    await api(ctx).get('/api/v1/courses').expect(401);

    const student = await registerStudent(ctx, 'student@test.local');
    const res = await api(ctx)
      .post('/api/v1/courses')
      .set(auth(student.token))
      .send({ title: 'Курс студента', categoryId: '000000000000000000000000' })
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await ctx.connection.collection('courses').countDocuments()).toBe(0);
  });

  it('чужой курс: посторонний студент и другой преподаватель получают 404, курс не меняется', async () => {
    const f = await createCourseWithStudent(ctx);
    const outsider = await registerStudent(ctx, 'outsider@test.local');
    const otherTeacher = await createTeacher(ctx, 'other.teacher@test.local');

    await api(ctx).get(`/api/v1/courses/${f.courseId}`).set(auth(outsider.token)).expect(404);
    await api(ctx).get(`/api/v1/courses/${f.courseId}`).set(auth(otherTeacher.token)).expect(404);
    await api(ctx)
      .patch(`/api/v1/courses/${f.courseId}`)
      .set(auth(otherTeacher.token))
      .send({ title: 'Взломанный курс', version: 1 })
      .expect(404);

    const course = await ctx.connection.collection('courses').findOne({});
    expect(course?.title).toBe('Тестовый курс');
    expect(course?.version).toBe(1);
  });

  it('чужая работа недоступна и текст не утекает', async () => {
    const f = await createCourseWithStudent(ctx);
    const created = await api(ctx)
      .post(`/api/v1/assignments/${f.assignmentId}/submissions`)
      .set(auth(f.student.token))
      .send({ text: 'Секретный текст работы' })
      .expect(201);

    // Второй студент того же курса
    const classmate = await registerStudent(ctx, 'classmate@test.local');
    await api(ctx)
      .post(`/api/v1/courses/${f.courseId}/enrollments`)
      .set(auth(f.teacher.token))
      .send({ email: classmate.email })
      .expect(201);

    const res = await api(ctx).get(`/api/v1/submissions/${created.body.id}`).set(auth(classmate.token)).expect(404);
    expect(JSON.stringify(res.body)).not.toContain('Секретный');

    // Его история версий пуста: чужие версии в список не попадают
    const list = await api(ctx)
      .get(`/api/v1/assignments/${f.assignmentId}/submissions`)
      .set(auth(classmate.token))
      .expect(200);
    expect(list.body.total).toBe(0);
  });

  it('после отчисления студент сразу теряет доступ к курсу', async () => {
    const f = await createCourseWithStudent(ctx);
    await api(ctx).get(`/api/v1/courses/${f.courseId}`).set(auth(f.student.token)).expect(200);

    const enrollments = await api(ctx)
      .get(`/api/v1/courses/${f.courseId}/enrollments`)
      .set(auth(f.teacher.token))
      .expect(200);
    const enrollmentId = enrollments.body.items[0].id;

    await api(ctx)
      .post(`/api/v1/courses/${f.courseId}/enrollments/${enrollmentId}/remove`)
      .set(auth(f.teacher.token))
      .send({ reason: 'Тестовое отчисление' })
      .expect(200);

    await api(ctx).get(`/api/v1/courses/${f.courseId}`).set(auth(f.student.token)).expect(404);
    await api(ctx)
      .post(`/api/v1/assignments/${f.assignmentId}/submissions`)
      .set(auth(f.student.token))
      .send({ text: 'Попытка сдать после отчисления' })
      .expect(404);

    // Повторное отчисление не меняет запись второй раз
    await api(ctx)
      .post(`/api/v1/courses/${f.courseId}/enrollments/${enrollmentId}/remove`)
      .set(auth(f.teacher.token))
      .send({ reason: 'Повтор' })
      .expect(409);
  });

  it('неверный формат id - 400 INVALID_ID', async () => {
    const teacher = await createTeacher(ctx, 'teacher@test.local');
    const res = await api(ctx).get('/api/v1/courses/not-an-id').set(auth(teacher.token)).expect(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });
});
