import { api, clearDatabase, createTestApp, PASSWORD, TestContext } from '../helpers/test-app';

describe('Вход и регистрация (HTTP + тестовая MongoDB)', () => {
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

  it('регистрация создает студента, нормализует email и не отдает хеш пароля', async () => {
    const res = await api(ctx)
      .post('/api/v1/auth/register')
      .send({ displayName: 'Иван Петров', email: '  Ivan.Petrov@Example.com ', password: PASSWORD })
      .expect(201);

    expect(res.body.user).toMatchObject({ role: 'student', email: 'ivan.petrov@example.com' });
    expect(typeof res.body.token).toBe('string');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const stored = await ctx.connection.collection('users').findOne({ email: 'ivan.petrov@example.com' });
    expect(stored?.passwordHash).toBeDefined();
    expect(stored?.passwordHash).not.toBe(PASSWORD);
  });

  it('поле role в регистрации отклоняется, пользователь не создается', async () => {
    const res = await api(ctx)
      .post('/api/v1/auth/register')
      .send({ displayName: 'Хитрый', email: 'hacker@example.com', password: PASSWORD, role: 'teacher' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields.role).toBe('Неизвестное поле');
    expect(await ctx.connection.collection('users').countDocuments()).toBe(0);
  });

  it('короткий пароль - ошибка поля password', async () => {
    const res = await api(ctx)
      .post('/api/v1/auth/register')
      .send({ displayName: 'Иван', email: 'ivan@example.com', password: 'short' })
      .expect(400);
    expect(res.body.error.fields.password).toBeDefined();
  });

  it('повторный email - 409, неверный пароль и неизвестный email - одно сообщение 401', async () => {
    const body = { displayName: 'Иван', email: 'ivan@example.com', password: PASSWORD };
    await api(ctx).post('/api/v1/auth/register').send(body).expect(201);

    const dup = await api(ctx).post('/api/v1/auth/register').send(body).expect(409);
    expect(dup.body.error.code).toBe('EMAIL_TAKEN');

    const wrongPassword = await api(ctx)
      .post('/api/v1/auth/login')
      .send({ email: 'ivan@example.com', password: 'wrong-password-1' })
      .expect(401);
    const unknownEmail = await api(ctx)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD })
      .expect(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});
