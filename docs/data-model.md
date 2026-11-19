# Модель данных MongoDB

База: MongoDB Atlas (replica set), ODM: Mongoose 8. Схемы лежат в `api/src/models`.

## Общие правила

- Связи между коллекциями задаются через `ObjectId`. Mongoose не создает внешних ключей, поэтому существование связанных документов проверяется в сервисах.
- Все даты имеют тип `Date` и хранятся в UTC. Сайт показывает их в часовом поясе Asia/Almaty.
- Количества и баллы хранятся целыми неотрицательными числами. Дробных денежных значений в теме нет.
- Владелец, начальный статус, время и `version` назначает сервер. Эти поля от клиента не принимаются.
- Вместо удаления записи архивируются (`archived` / `status`), чтобы не терять историю.
- Служебное поле `__v` отключено. Для защиты от одновременного редактирования используется явное поле `version`.

## Коллекции

### users

| Поле | Тип | Правила |
|---|---|---|
| displayName | String | обязательно, 2–80 символов |
| email | String | обязательно, нижний регистр, до 254, **уникально** |
| passwordHash | String | bcrypt-хеш, не выбирается по умолчанию (`select: false`) |
| role | String | `teacher` \| `student`, по умолчанию `student` |
| active | Boolean | по умолчанию `true`, отключенный аккаунт не может войти |
| createdAt / updatedAt | Date | автоматически |

### categories

| Поле | Тип | Правила |
|---|---|---|
| name | String | обязательно, 2–80 |
| parentId | ObjectId → categories \| null | `null` для верхнего уровня |
| archived | Boolean | по умолчанию `false` |
| createdBy | ObjectId → users | кто создал |

### courses

| Поле | Тип | Правила |
|---|---|---|
| title | String | обязательно, 3–120 |
| description | String | до 4000 |
| categoryId | ObjectId → categories | обязательно |
| teacherId | ObjectId → users | владелец, назначается сервером |
| status | String | `active` \| `archived` |
| version | Number | целое ≥ 1, растет при каждом изменении |

### enrollments

| Поле | Тип | Правила |
|---|---|---|
| courseId | ObjectId → courses | обязательно |
| studentId | ObjectId → users | обязательно |
| status | String | `active` \| `removed` |
| enrolledBy | ObjectId → users | преподаватель, который зачислил |
| guardVersion | Number | целое ≥ 0, увеличивается при каждой сдаче работы |
| removedAt | Date \| null | когда студента отчислили с курса |

### assignments

| Поле | Тип | Правила |
|---|---|---|
| courseId | ObjectId → courses | обязательно |
| title | String | обязательно, 3–120 |
| text | String | обязательно, до 4000 |
| dueAt | Date | срок сдачи (UTC) |
| maxScore | Number | целое 1–1000 |
| settings | вложенный объект | `maxVersions` 1–50 (по умолчанию 20), `minTextLength` 1–5000 (по умолчанию 1) |
| status | String | `published` \| `archived` |
| createdBy | ObjectId → users | автор задания |
| version | Number | целое ≥ 1 |

### submissions (версии работ)

| Поле | Тип | Правила |
|---|---|---|
| assignmentId | ObjectId → assignments | обязательно |
| courseId | ObjectId → courses | копия из задания, для проверки доступа и отчетов |
| studentId | ObjectId → users | автор |
| number | Number | целое ≥ 1, номер версии |
| text | String | 1–20000 |
| submittedAt | Date | время сдачи, ставит сервер |
| isLate | Boolean | `true`, если `submittedAt > dueAt` |
| status | String | `submitted` \| `graded` |
| currentGrade | вложенный объект \| null | `gradeId`, `score`, `gradedBy`, `gradedAt` — копия действующей оценки |
| version | Number | целое ≥ 1, для защиты от одновременного оценивания |

### grades

| Поле | Тип | Правила |
|---|---|---|
| submissionId | ObjectId → submissions | оцененная версия |
| assignmentId, courseId, studentId | ObjectId | копии для отчетов |
| score | Number | целое, от 0 до `maxScore` задания (проверка в сервисе) |
| comment | String | до 2000 |
| gradedBy | ObjectId → users | преподаватель |
| gradedAt | Date | время оценки |

## Встраивание или ссылки

| Решение | Почему |
|---|---|
| `assignments.settings` — вложенный объект | маленький, всегда читается вместе с заданием, без собственной жизни |
| `submissions.currentGrade` — вложенная копия | список работ и итог студента читаются без отдельного запроса к оценкам |
| `grades` — отдельная коллекция | история оценок растет. Бесконечный массив в одном документе недопустим |
| версии работ — отдельная коллекция, а не массив в задании | версий много и они большие (до 20000 символов). Читаются постранично |
| зачисления — отдельная коллекция | связь «многие ко многим» курс ↔ студент с историей отчислений |

## Индексы

| Коллекция | Индекс | Назначение |
|---|---|---|
| users | `{ email: 1 }` unique | уникальный email |
| categories | `{ parentId: 1, name: 1 }` unique, partial `archived: false`, collation ru/strength 2 | нет двух действующих категорий с одним именем у одного родителя |
| courses | `{ teacherId: 1, status: 1, createdAt: -1 }` | список «Мои курсы» преподавателя |
| courses | `{ categoryId: 1 }` | проверка курсов перед архивированием категории |
| enrollments | `{ courseId: 1, studentId: 1 }` unique, partial `status: 'active'` | одно действующее зачисление на курс. Записи `removed` в уникальности не участвуют |
| enrollments | `{ studentId: 1, status: 1, createdAt: -1 }` | курсы студента |
| assignments | `{ courseId: 1, status: 1, dueAt: 1 }` | задания курса по сроку |
| submissions | `{ assignmentId: 1, studentId: 1, number: 1 }` unique | **предметная уникальность**: номер версии внутри пары студент–задание. Также история версий |
| submissions | `{ assignmentId: 1, submittedAt: -1 }` | кабинет оценивания |
| submissions | `{ courseId: 1, submittedAt: -1 }` | отчеты курса за период |
| grades | `{ submissionId: 1, gradedAt: -1 }` | история оценок версии |
| grades | `{ courseId: 1, studentId: 1 }` | личные результаты |

Ошибка дубликата (код 11000) переводится сервером в ответ `409`.

## Согласованность

- **Сдача версии** выполняется в транзакции: увеличивается `enrollments.guardVersion` студента, затем определяется следующий номер версии и вставляется документ версии. Две одновременные сдачи одного студента конфликтуют на документе зачисления, поэтому вторая транзакция перечитывает данные и получает следующий номер. Уникальный индекс номера служит второй линией защиты.
- **Оценка** выполняется в транзакции: условное обновление версии работы по `version` (устаревшая форма получает `409`), запись `currentGrade` и вставка документа в `grades` с одной датой `gradedAt`.
- **Редактирование** курса и задания — условное обновление по `version` с увеличением. Устаревшая форма получает `409`.
