# Пример Prisma: чтение категорий (самостоятельная тема)

Изолированный пример. Он **только читает** коллекцию `categories` рабочей базы через Prisma и через Mongoose и сравнивает результат. Основное приложение по-прежнему пишет через Mongoose. Двойного слоя записи и переноса модели на Prisma нет.

## Запуск

```bash
cd scripts/prisma-read
npm install
copy .env.example .env     # MONGODB_URI - та же строка, что в api/.env
npm start                  # prisma generate + чтение и сравнение
```

`prisma db push` и `prisma migrate` запускать **не нужно и нельзя**: они изменили бы рабочую базу.

## Версия

Prisma **6.19** — последняя линия Prisma ORM с поддержкой MongoDB. В Prisma 7 коннектора MongoDB пока нет.

## Сопоставление с Mongoose

| | Mongoose (основное приложение) | Prisma (пример) |
|---|---|---|
| Описание модели | `Schema` в TypeScript (`api/src/models/category.schema.ts`) | `prisma/schema.prisma` |
| Имя коллекции | `collection: 'categories'` в опциях схемы | `@@map("categories")` |
| `_id` | `_id: ObjectId`, в ответах API приводится к строке вручную (`String(_id)`) | `id String @id @map("_id") @db.ObjectId`: в коде сразу строка |
| Ссылки | `parentId: ObjectId`, `ref: 'Category'`, внешнего ключа нет | `parentId String? @db.ObjectId`, тоже без внешнего ключа |
| Запрос | `find({ archived: false }).sort({ name: 1 }).limit(20).lean()` | `findMany({ where: { archived: false }, orderBy: { name: 'asc' }, take: 20 })` |
| Типы | интерфейс `Category` пишем сами | клиент с типами генерирует `prisma generate` |
| Валидация, хуки, индексы | в схеме Mongoose (min/max, enum, `index`) | в этом примере не используются: только чтение |
| Транзакции | через сессию MongoDB (используются при сдаче и оценке) | в этом примере не нужны |

## Почему основной путь записи остался в Mongoose

- ТЗ и силлабус требуют Mongoose как основной ODM.
- Модель (вложенные объекты, частичные уникальные индексы, условные обновления по `version`, транзакции с `guardVersion`) уже описана и проверена тестами на Mongoose.
- Два слоя записи в одни и те же коллекции дали бы два разных набора правил. Поэтому Prisma здесь только читает.
