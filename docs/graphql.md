# GraphQL

Адрес: `POST http://localhost:4000/graphql`, заголовок `Authorization: Bearer <JWT>`. Полная схема генерируется из кода при запуске API и лежит в `api/schema.gql`. В режиме разработки по `GET /graphql` открывается GraphiQL.

## Две Query

| Query | Что возвращает |
|---|---|
| `myCourses(page: Int = 1, limit: Int = 10): CoursePage!` | мои курсы: преподавателю свои, студенту те, куда он зачислен. Страница `{ items, page, limit, total }` |
| `assignment(id: ID!): Assignment!` | задание доступного курса и поле `submissions(page, limit)`: студенту — только свои версии, преподавателю курса — все работы |

Mutation в GraphQL нет: изменения идут через REST, как разрешает ТЗ.

### Пример 1 — myCourses

```graphql
query MyCourses($page: Int!) {
  myCourses(page: $page, limit: 10) {
    total
    items { id title status category { name } teacher { displayName } }
  }
}
```

Переменные: `{ "page": 1 }`. Ответ:

```json
{ "data": { "myCourses": { "total": 2, "items": [
  { "id": "…", "title": "Базы данных MongoDB", "status": "active",
    "category": { "name": "Базы данных" }, "teacher": { "displayName": "Анна Смирнова" } }
] } } }
```

### Пример 2 — assignment с версиями

```graphql
query Assignment($id: ID!) {
  assignment(id: $id) {
    title
    dueAt
    maxScore
    isOverdue
    course { title }
    submissions(limit: 20) {
      total
      items { number submittedAt isLate student { displayName } currentGrade { score } }
    }
  }
}
```

Студент получит только свои версии. Преподаватель курса — все работы задания.

## Тот же доступ и те же сервисы, что в REST

- Резолверы (`api/src/gql/study.resolver.ts`) вызывают `CoursesService.list`, `AssignmentsService.getOne` и `SubmissionsService.list`. Бизнес-логика и проверки не дублируются.
- Глобальные guard-ы входа и ролей работают и для GraphQL (`common/request-context.ts`), в том числе для поля `submissions` (`fieldResolverEnhancers`).
- Ошибки переводятся тем же фильтром: в `extensions` приходят `code`, `status` и `fields`, технического стека нет.

| Ситуация | Ответ |
|---|---|
| Нет токена | `errors[0].extensions.code = "UNAUTHORIZED"` |
| Посторонний студент запрашивает чужое задание (**отказ для роли**) | `NOT_FOUND`, `data: null` |
| `limit` больше 20 | `VALIDATION_ERROR` |
| Неверный формат id | `INVALID_ID` |

## Ограничения размера запроса

- **Вложенность:** не больше 5 уровней (`QUERY_TOO_DEEP`).
- **Поля:** не больше 60 полей в операции (`QUERY_TOO_LARGE`), алиасы считаются отдельными полями.
- Обе проверки (`api/src/gql/query-limits.ts`) выполняются до запуска резолверов, тяжелый запрос не доходит до базы.
- **Число записей:** `limit` в `myCourses` и `submissions` — не больше 20 на страницу.
- **Без N+1:** названия категорий и имена загружаются одним запросом на страницу. `submissions` — один запрос на задание.

## Чем GraphQL отличается от REST здесь

| | REST `GET /api/v1/courses` | GraphQL `myCourses` |
|---|---|---|
| Состав ответа | фиксирован сервером: все поля курса, включая описание, `version`, даты | клиент перечисляет нужные поля, лишние не передаются |
| Связанные данные | задания и версии — отдельные запросы (`/courses/:id/assignments`, `/assignments/:id/submissions`) | задание и его версии — одним запросом (`assignment { submissions { … } }`) |
| Ошибки | HTTP-коды 400/401/403/404/409 | HTTP 200 с массивом `errors` и кодом в `extensions` (ошибки валидации запроса — 400) |
| Изменения | все команды | только чтение (Mutation не нужны по ТЗ) |

Страница сайта на GraphQL: **«Обзор курсов (GraphQL)»** (`/overview`, ссылка в личном кабинете).
