import { getConnectionToken } from '@nestjs/mongoose';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { hashPassword } from '../../src/auth/password';

export const PASSWORD = 'test-password-1';
const DAY = 24 * 60 * 60 * 1000;

export interface TestContext {
  app: NestExpressApplication;
  connection: Connection;
}

// Поднимает настоящее приложение (тот же AppModule и та же настройка, что в main.ts)
// с подключением к тестовой MongoDB
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>(new ExpressAdapter(), { bodyParser: false });
  configureApp(app);
  await app.init(); // дожидается создания индексов
  return { app, connection: app.get<Connection>(getConnectionToken()) };
}

// Очищает документы, но сохраняет индексы (уникальность нужна тестам)
export async function clearDatabase(connection: Connection): Promise<void> {
  await Promise.all(Object.values(connection.collections).map((c) => c.deleteMany({})));
}

export function api(ctx: TestContext) {
  return request(ctx.app.getHttpServer());
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Преподаватель создается напрямую в базе (через сайт такую роль получить нельзя)
export async function createTeacher(ctx: TestContext, email: string, displayName = 'Преподаватель Тестов') {
  const users = ctx.connection.collection('users');
  const now = new Date();
  await users.insertOne({
    displayName,
    email,
    passwordHash: await hashPassword(PASSWORD),
    role: 'teacher',
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  const res = await api(ctx).post('/api/v1/auth/login').send({ email, password: PASSWORD }).expect(200);
  return { token: res.body.token as string, id: res.body.user.id as string };
}

export async function registerStudent(ctx: TestContext, email: string, displayName = 'Студент Тестов') {
  const res = await api(ctx)
    .post('/api/v1/auth/register')
    .send({ displayName, email, password: PASSWORD })
    .expect(201);
  return { token: res.body.token as string, id: res.body.user.id as string, email };
}

export interface CourseFixture {
  teacher: { token: string; id: string };
  student: { token: string; id: string; email: string };
  courseId: string;
  assignmentId: string;
}

// Типовой набор: преподаватель, категория, курс, зачисленный студент и задание - через API
export async function createCourseWithStudent(
  ctx: TestContext,
  settings: { maxVersions?: number; minTextLength?: number } = {},
): Promise<CourseFixture> {
  const teacher = await createTeacher(ctx, 'teacher@test.local');
  const student = await registerStudent(ctx, 'student@test.local');

  const category = await api(ctx)
    .post('/api/v1/categories')
    .set(auth(teacher.token))
    .send({ name: 'Тестовая категория' })
    .expect(201);
  const course = await api(ctx)
    .post('/api/v1/courses')
    .set(auth(teacher.token))
    .send({ title: 'Тестовый курс', categoryId: category.body.id })
    .expect(201);
  await api(ctx)
    .post(`/api/v1/courses/${course.body.id}/enrollments`)
    .set(auth(teacher.token))
    .send({ email: student.email })
    .expect(201);
  const assignment = await api(ctx)
    .post(`/api/v1/courses/${course.body.id}/assignments`)
    .set(auth(teacher.token))
    .send({
      title: 'Тестовое задание',
      text: 'Условие тестового задания',
      dueAt: new Date(Date.now() + 7 * DAY).toISOString(),
      maxScore: 100,
      settings,
    })
    .expect(201);

  return { teacher, student, courseId: course.body.id, assignmentId: assignment.body.id };
}
