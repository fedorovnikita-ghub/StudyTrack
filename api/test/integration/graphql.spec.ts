import { api, auth, clearDatabase, createCourseWithStudent, createTestApp, registerStudent, TestContext } from '../helpers/test-app';

const MY_COURSES = `
  query MyCourses($page: Int!) {
    myCourses(page: $page, limit: 10) {
      total
      items { id title teacher { displayName } category { name } }
    }
  }`;

const ASSIGNMENT = `
  query Assignment($id: ID!) {
    assignment(id: $id) {
      title
      isOwner
      submissions(limit: 20) { total items { number student { id } } }
    }
  }`;

// GraphQL использует те же сервисы и проверки доступа, что и REST
describe('GraphQL (HTTP + тестовая MongoDB)', () => {
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

  function gql(query: string, variables: Record<string, unknown>, token?: string) {
    const req = api(ctx).post('/graphql').send({ query, variables });
    return token ? req.set(auth(token)) : req;
  }

  it('myCourses: свои курсы с названиями связей, постороннему - пусто, без входа - UNAUTHORIZED', async () => {
    const f = await createCourseWithStudent(ctx);
    const outsider = await registerStudent(ctx, 'outsider@test.local');

    const teacher = await gql(MY_COURSES, { page: 1 }, f.teacher.token).expect(200);
    expect(teacher.body.data.myCourses.total).toBe(1);
    expect(teacher.body.data.myCourses.items[0]).toMatchObject({
      title: 'Тестовый курс',
      category: { name: 'Тестовая категория' },
    });

    const other = await gql(MY_COURSES, { page: 1 }, outsider.token).expect(200);
    expect(other.body.data.myCourses.total).toBe(0);

    const anonymous = await gql(MY_COURSES, { page: 1 });
    expect(anonymous.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
  });

  it('assignment: студенту только свои версии, преподавателю все, постороннему - NOT_FOUND', async () => {
    const f = await createCourseWithStudent(ctx);
    const classmate = await registerStudent(ctx, 'classmate@test.local');
    await api(ctx)
      .post(`/api/v1/courses/${f.courseId}/enrollments`)
      .set(auth(f.teacher.token))
      .send({ email: classmate.email })
      .expect(201);
    for (const token of [f.student.token, classmate.token]) {
      await api(ctx)
        .post(`/api/v1/assignments/${f.assignmentId}/submissions`)
        .set(auth(token))
        .send({ text: 'Работа' })
        .expect(201);
    }

    const student = await gql(ASSIGNMENT, { id: f.assignmentId }, f.student.token).expect(200);
    expect(student.body.data.assignment.isOwner).toBe(false);
    expect(student.body.data.assignment.submissions.total).toBe(1);
    expect(student.body.data.assignment.submissions.items[0].student.id).toBe(f.student.id);

    const teacher = await gql(ASSIGNMENT, { id: f.assignmentId }, f.teacher.token).expect(200);
    expect(teacher.body.data.assignment.isOwner).toBe(true);
    expect(teacher.body.data.assignment.submissions.total).toBe(2);

    const outsider = await registerStudent(ctx, 'outsider@test.local');
    const denied = await gql(ASSIGNMENT, { id: f.assignmentId }, outsider.token).expect(200);
    expect(denied.body.data).toBeNull();
    expect(denied.body.errors[0].extensions.code).toBe('NOT_FOUND');
  });

  it('ограничения: limit больше 20, слишком много полей, слишком глубокий запрос', async () => {
    const f = await createCourseWithStudent(ctx);

    const bigLimit = await gql('query { myCourses(limit: 50) { total } }', {}, f.teacher.token);
    expect(bigLimit.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');

    const manyFields = Array.from({ length: 70 }, (_, i) => `a${i}: total`).join(' ');
    const tooLarge = await gql(`query { myCourses { ${manyFields} } }`, {}, f.teacher.token).expect(400);
    expect(tooLarge.body.errors.map((e: { extensions: { code: string } }) => e.extensions.code)).toContain('QUERY_TOO_LARGE');

    const deep = 'query { myCourses { items { category { name { a { b } } } } } }';
    const tooDeep = await gql(deep, {}, f.teacher.token).expect(400);
    expect(tooDeep.body.errors.map((e: { extensions: { code: string } }) => e.extensions.code)).toContain('QUERY_TOO_DEEP');
  });
});
