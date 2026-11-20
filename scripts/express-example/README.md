# Учебный пример: маршрут Express и его соответствие NestJS

Короткий маршрут «Мои курсы» на чистом Express с двумя middleware. Так проект мог выглядеть до перехода на NestJS. Данные хранятся в памяти, база не нужна.

```bash
cd scripts/express-example
npm install
npm start
curl -H "Authorization: Bearer token-teacher" http://localhost:4200/api/v1/courses
curl http://localhost:4200/api/v1/courses    # 401
```

## Соответствие частей

| Express (`index.js`) | NestJS (`api/src`) |
|---|---|
| `app.use(express.json())` | `app.use(json({ limit: '100kb' }))` в `app.setup.ts` |
| middleware журнала запросов | встроенный `Logger` Nest |
| middleware `requireAuth`, `req.user` | глобальный `JwtAuthGuard` (`auth/jwt-auth.guard.ts`), декоратор `@CurrentUser()` |
| проверка роли внутри функции | `RolesGuard` + декоратор `@Roles('teacher')` |
| функция `listMyCourses(user)` | `CoursesService.list()` — бизнес-правило отдельно от HTTP |
| `app.get('/api/v1/courses', …)` | `CoursesController.list()` с `@Get()` в `@Controller('courses')` и глобальным префиксом `api/v1` |
| ручной `res.status(401).json(...)` | исключение `AppError` и единый `AllExceptionsFilter` |
| объекты создаются вручную | dependency injection: Nest сам создает сервисы и передает их в конструкторы контроллеров |
| проверки тела запроса вручную | DTO с class-validator и глобальный `ValidationPipe` |

Под капотом NestJS работает на том же Express: адаптер выбран явно (`new ExpressAdapter()` в `main.ts`). Настоящие Express-маршруты используются в отдельном `report-service`.
