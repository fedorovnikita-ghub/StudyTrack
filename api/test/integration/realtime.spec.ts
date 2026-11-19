import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import { api, auth, clearDatabase, createCourseWithStudent, createTestApp, registerStudent, TestContext } from '../helpers/test-app';

// Socket.IO: событие получают только автор работы и преподаватель курса
describe('Реальное время (Socket.IO + тестовая MongoDB)', () => {
  let ctx: TestContext;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    ctx = await createTestApp();
    await ctx.app.listen(0); // случайный свободный порт
    const address = ctx.app.getHttpServer().address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;
  });
  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });
  afterEach(() => {
    sockets.splice(0).forEach((s) => s.disconnect());
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  // Подключение и ожидание, пока сервер проверит токен и добавит сокет в комнату
  function connect(token: string): Promise<Socket> {
    const socket = io(url, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
    sockets.push(socket);
    return new Promise((resolve, reject) => {
      socket.once('realtime.ready', () => resolve(socket));
      socket.once('auth.error', (e: { message: string }) => reject(new Error(e.message)));
      socket.once('connect_error', reject);
    });
  }

  function waitForEvent<T>(socket: Socket, event: string, ms = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Событие ${event} не пришло за ${ms} мс`)), ms);
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  }

  function expectNoEvent(socket: Socket, event: string, ms = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      const handler = () => reject(new Error(`Посторонний получил ${event}`));
      socket.once(event, handler);
      setTimeout(() => {
        socket.off(event, handler);
        resolve();
      }, ms);
    });
  }

  it('submission.created и grade.changed приходят автору и преподавателю, но не постороннему', async () => {
    const f = await createCourseWithStudent(ctx);
    const outsider = await registerStudent(ctx, 'outsider@test.local');

    const [studentSocket, teacherSocket, outsiderSocket] = await Promise.all([
      connect(f.student.token),
      connect(f.teacher.token),
      connect(outsider.token),
    ]);

    // Сдача работы
    const created = waitForEvent<Record<string, string>>(teacherSocket, 'submission.created');
    const createdForAuthor = waitForEvent(studentSocket, 'submission.created');
    const silentOutsider = expectNoEvent(outsiderSocket, 'submission.created');
    const sub = await api(ctx)
      .post(`/api/v1/assignments/${f.assignmentId}/submissions`)
      .set(auth(f.student.token))
      .send({ text: 'Работа для проверки событий' })
      .expect(201);

    const event = await created;
    await createdForAuthor;
    await silentOutsider;
    expect(event).toMatchObject({ type: 'submission.created', submissionId: sub.body.id, assignmentId: f.assignmentId });
    // В событии нет текста работы: данные клиент берет через API
    expect(JSON.stringify(event)).not.toContain('Работа для проверки');

    // Оценка
    const graded = waitForEvent<Record<string, unknown>>(studentSocket, 'grade.changed');
    const silent = expectNoEvent(outsiderSocket, 'grade.changed');
    await api(ctx)
      .post(`/api/v1/submissions/${sub.body.id}/grade`)
      .set(auth(f.teacher.token))
      .send({ score: 77, version: 1 })
      .expect(200);
    const gradeEvent = await graded;
    await silent;
    expect(gradeEvent).toMatchObject({ type: 'grade.changed', submissionId: sub.body.id });
    expect(gradeEvent).not.toHaveProperty('score');
  });

  it('подключение с неверным токеном отклоняется', async () => {
    await expect(connect('not-a-valid-token')).rejects.toThrow('Сессия истекла или недействительна');
  });
});
