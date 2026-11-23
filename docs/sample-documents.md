# Примеры реальных документов коллекций

Выгружено командой `npm run docs:samples` из демо-данных (`npm run seed`), 2026-11-23T14:38:16.384Z.
Формат — расширенный JSON MongoDB: `{"$oid": …}` — ObjectId, `{"$date": …}` — дата в UTC. Хеши паролей исключены.

## users

**Ссылки:**

- Ссылок нет. `email` уникален (индекс `uniq_email`), `passwordHash` в выгрузку не попадает

Документ 1:

```json
{
  "_id": {
    "$oid": "6b044fd1b4282c067e0eb1a7"
  },
  "displayName": "Анна Смирнова",
  "email": "anna.smirnova@studytrack.demo",
  "role": "teacher",
  "active": true,
  "createdAt": {
    "$date": "2026-11-23T14:38:09.597Z"
  },
  "updatedAt": {
    "$date": "2026-11-23T14:38:09.597Z"
  }
}
```

Документ 2:

```json
{
  "_id": {
    "$oid": "6b044fd1b4282c067e0eb1a9"
  },
  "displayName": "Айгерим Сапарова",
  "email": "aigerim@studytrack.demo",
  "role": "student",
  "active": true,
  "createdAt": {
    "$date": "2026-11-23T14:38:09.598Z"
  },
  "updatedAt": {
    "$date": "2026-11-23T14:38:09.598Z"
  }
}
```

## categories

**Ссылки:**

- `parentId` → `categories._id` (родитель, `null` у верхнего уровня)
- `createdBy` → `users._id` (автор)

## courses

**Ссылки:**

- `categoryId` → `categories._id`
- `teacherId` → `users._id` (владелец курса)

## enrollments

**Ссылки:**

- `courseId` → `courses._id`
- `studentId` → `users._id`
- `enrolledBy` → `users._id` (преподаватель)

## assignments

**Ссылки:**

- `courseId` → `courses._id`
- `createdBy` → `users._id`
- `settings` — вложенный объект, не ссылка

## submissions

**Ссылки:**

- `assignmentId` → `assignments._id`
- `courseId` → `courses._id` (копия из задания)
- `studentId` → `users._id` (автор)
- `currentGrade.gradeId` → `grades._id`, `currentGrade.gradedBy` → `users._id`

## grades

**Ссылки:**

- `submissionId` → `submissions._id` (оцененная версия)
- `assignmentId`, `courseId`, `studentId` — копии для отчетов
- `gradedBy` → `users._id`
