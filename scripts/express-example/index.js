// Учебный пример: так выглядел бы маршрут "Мои курсы" на чистом Express.
// В проекте он реализован в NestJS (api/src/courses). Данные здесь - в памяти, без базы.
import express from 'express';

const app = express();
app.use(express.json());

// Данные-заглушки
const users = { 'token-teacher': { id: 't1', role: 'teacher' }, 'token-student': { id: 's1', role: 'student' } };
const courses = [
  { id: 'c1', title: 'Веб-программирование на JS', teacherId: 't1' },
  { id: 'c2', title: 'Базы данных MongoDB', teacherId: 't2' },
];

// Middleware 1: журнал запросов (в NestJS - встроенный Logger / interceptor)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Middleware 2: проверка входа (в NestJS - JwtAuthGuard)
function requireAuth(req, res, next) {
  const token = req.get('Authorization')?.replace('Bearer ', '');
  const user = token ? users[token] : undefined;
  if (!user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Требуется вход в систему' } });
    return;
  }
  req.user = user;
  next();
}

// "Сервис": правило выборки отдельно от HTTP (в NestJS - CoursesService.list)
function listMyCourses(user) {
  return courses.filter((c) => user.role === 'teacher' && c.teacherId === user.id);
}

// Маршрут (в NestJS - CoursesController.list с @Get())
app.get('/api/v1/courses', requireAuth, (req, res) => {
  const items = listMyCourses(req.user);
  res.json({ items, page: 1, limit: 20, total: items.length });
});

app.listen(4200, () => console.log('Учебный пример: http://localhost:4200/api/v1/courses'));
