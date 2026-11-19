// Демо-данные для показа и ручной проверки.
//   npm run seed        - добавить демо-данные (если их еще нет)
//   npm run seed:reset  - удалить прежние демо-данные и создать заново
// Рабочие данные не трогаются: удаляется только то, что связано с адресами @studytrack.demo.
// Все даты считаются от момента запуска, поэтому сроки не устаревают.
import mongoose, { Model, Types } from 'mongoose';
import { hashPassword } from '../auth/password';
import { config } from '../config';
import {
  Assignment,
  ASSIGNMENT_MODEL,
  AssignmentSchema,
  Category,
  CATEGORY_MODEL,
  CategorySchema,
  Course,
  COURSE_MODEL,
  CourseSchema,
  Enrollment,
  ENROLLMENT_MODEL,
  EnrollmentSchema,
  Grade,
  GRADE_MODEL,
  GradeSchema,
  Submission,
  SUBMISSION_MODEL,
  SubmissionSchema,
  User,
  USER_MODEL,
  UserRole,
  UserSchema,
} from '../models';
import { isLateSubmission } from '../submissions/submission-rules';

const DEMO_EMAIL = /@studytrack\.demo$/;
const DEMO_PASSWORD = 'demo-pass-2026';
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

interface Models {
  users: Model<User>;
  categories: Model<Category>;
  courses: Model<Course>;
  enrollments: Model<Enrollment>;
  assignments: Model<Assignment>;
  submissions: Model<Submission>;
  grades: Model<Grade>;
}

function getModels(): Models {
  return {
    users: mongoose.model(USER_MODEL, UserSchema),
    categories: mongoose.model(CATEGORY_MODEL, CategorySchema),
    courses: mongoose.model(COURSE_MODEL, CourseSchema),
    enrollments: mongoose.model(ENROLLMENT_MODEL, EnrollmentSchema),
    assignments: mongoose.model(ASSIGNMENT_MODEL, AssignmentSchema),
    submissions: mongoose.model(SUBMISSION_MODEL, SubmissionSchema),
    grades: mongoose.model(GRADE_MODEL, GradeSchema),
  };
}

const DEMO_USERS: { key: string; displayName: string; email: string; role: UserRole }[] = [
  { key: 'anna', displayName: 'Анна Смирнова', email: 'anna.smirnova@studytrack.demo', role: 'teacher' },
  { key: 'oleg', displayName: 'Олег Иванов', email: 'oleg.ivanov@studytrack.demo', role: 'teacher' },
  { key: 'aigerim', displayName: 'Айгерим Сапарова', email: 'aigerim@studytrack.demo', role: 'student' },
  { key: 'daniyar', displayName: 'Данияр Ахметов', email: 'daniyar@studytrack.demo', role: 'student' },
  { key: 'maria', displayName: 'Мария Ким', email: 'maria@studytrack.demo', role: 'student' },
  { key: 'timur', displayName: 'Тимур Есенов', email: 'timur@studytrack.demo', role: 'student' },
  { key: 'outsider', displayName: 'Посторонний Пользователь', email: 'outsider@studytrack.demo', role: 'student' },
];

async function main() {
  const reset = process.argv.includes('--reset');
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10_000 });

  try {
    const m = getModels();
    // Индексы должны существовать до вставки данных
    for (const model of Object.values(m)) {
      await model.init();
    }

    const hasDemo = await m.users.exists({ email: DEMO_EMAIL });
    if (hasDemo && !reset) {
      console.log('Демо-данные уже есть. Чтобы пересоздать их, выполните: npm run seed:reset');
      return;
    }
    if (hasDemo) {
      await removeDemoData(m);
    }

    const stats = await createDemoData(m);
    console.log(
      `Готово: пользователей ${stats.users}, курсов ${stats.courses}, зачислений ${stats.enrollments}, ` +
        `заданий ${stats.assignments}, версий работ ${stats.submissions}, оценок ${stats.grades}`,
    );
    console.log(`\nДемо-входы (пароль у всех: ${DEMO_PASSWORD}):`);
    console.table(DEMO_USERS.map((u) => ({ Роль: u.role, Имя: u.displayName, Email: u.email })));
  } finally {
    await mongoose.disconnect();
  }
}

async function createDemoData(m: Models) {
  const now = Date.now();
  // Момент относительно запуска: at(-2) - два дня назад, at(0, 3) - через три часа
  const at = (days: number, hours = 0) => new Date(now + days * DAY + hours * HOUR);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const created = await m.users.insertMany(
    DEMO_USERS.map((u) => ({ displayName: u.displayName, email: u.email, role: u.role, passwordHash })),
  );
  const user = Object.fromEntries(DEMO_USERS.map((u, i) => [u.key, created[i]]));
  const { anna, oleg, aigerim, daniyar, maria, timur } = user;

  // ---------- Категории (счетчики согласованы с курсами) ----------
  const programming = await m.categories.create({ name: 'Программирование', createdBy: anna._id, childrenCount: 2 });
  const web = await m.categories.create({
    name: 'Веб-разработка',
    parentId: programming._id,
    createdBy: anna._id,
    coursesCount: 1,
  });
  const databases = await m.categories.create({
    name: 'Базы данных',
    parentId: programming._id,
    createdBy: anna._id,
    coursesCount: 1,
  });
  const math = await m.categories.create({ name: 'Математика', createdBy: oleg._id, coursesCount: 1 });

  // ---------- Курсы ----------
  const jsCourse = await m.courses.create({
    title: 'Веб-программирование на JS',
    description: 'Node.js, NestJS, MongoDB и Next.js: от REST API до production-сборки.',
    categoryId: web._id,
    teacherId: anna._id,
  });
  const mongoCourse = await m.courses.create({
    title: 'Базы данных MongoDB',
    description: 'Документная модель, индексы, транзакции и агрегации.',
    categoryId: databases._id,
    teacherId: anna._id,
  });
  const mathCourse = await m.courses.create({
    title: 'Дискретная математика',
    description: 'Комбинаторика, графы и логика.',
    categoryId: math._id,
    teacherId: oleg._id,
  });

  // ---------- Зачисления ----------
  const enrollmentPlan: [typeof jsCourse, (typeof created)[number], (typeof created)[number]][] = [
    [jsCourse, aigerim, anna],
    [jsCourse, daniyar, anna],
    [jsCourse, maria, anna],
    [mongoCourse, aigerim, anna],
    [mongoCourse, timur, anna],
    [mongoCourse, maria, anna], // будет отчислена ниже
    [mathCourse, daniyar, oleg],
    [mathCourse, timur, oleg],
  ];
  const enrollments = await m.enrollments.insertMany(
    enrollmentPlan.map(([course, student, teacher]) => ({
      courseId: course._id,
      studentId: student._id,
      enrolledBy: teacher._id,
    })),
  );

  // ---------- Задания ----------
  const assignment = (course: typeof jsCourse, title: string, dueAt: Date, maxScore: number, maxVersions = 20, minTextLength = 1) =>
    m.assignments.create({
      courseId: course._id,
      title,
      text: `${title}. Подробное условие задания для демонстрации. Ответ сдается текстом.`,
      dueAt,
      maxScore,
      settings: { maxVersions, minTextLength },
      createdBy: course.teacherId,
    });

  const a1 = await assignment(jsCourse, 'Лабораторная 1: HTTP и REST', at(-10), 100);
  const a2 = await assignment(jsCourse, 'Лабораторная 2: модуль NestJS', at(-2), 50);
  const a3 = await assignment(jsCourse, 'Курсовой проект: StudyTrack', at(7), 100, 5, 50);
  const b1 = await assignment(mongoCourse, 'Схема коллекций', at(-5), 30);
  const b2 = await assignment(mongoCourse, 'Индексы и explain', at(3), 20);
  const c1 = await assignment(mathCourse, 'Комбинаторика', at(-3), 10);
  await assignment(mathCourse, 'Графы', at(10), 10);

  // ---------- Версии работ и оценки ----------
  const versionCounter = new Map<string, number>(); // номер версии в паре задание-студент
  const guardCounter = new Map<string, number>(); // число сдач студента в курсе = guardVersion
  let submissionsCount = 0;
  let gradesCount = 0;

  async function submit(a: typeof a1, student: (typeof created)[number], submittedAt: Date) {
    const pairKey = `${a._id}:${student._id}`;
    const number = (versionCounter.get(pairKey) ?? 0) + 1;
    versionCounter.set(pairKey, number);
    const guardKey = `${a.courseId}:${student._id}`;
    guardCounter.set(guardKey, (guardCounter.get(guardKey) ?? 0) + 1);
    submissionsCount += 1;

    return m.submissions.create({
      assignmentId: a._id,
      courseId: a.courseId,
      studentId: student._id,
      number,
      text:
        `Версия ${number}. ${student.displayName}: решение задания «${a.title}». ` +
        'Описание подхода, ключевые шаги и выводы по работе.',
      submittedAt,
      isLate: isLateSubmission(submittedAt, a.dueAt),
    });
  }

  async function grade(
    s: Awaited<ReturnType<typeof submit>>,
    teacher: (typeof created)[number],
    score: number,
    gradedAt: Date,
    comment = '',
  ) {
    const g = await m.grades.create({
      submissionId: s._id,
      assignmentId: s.assignmentId,
      courseId: s.courseId,
      studentId: s.studentId,
      score,
      comment,
      gradedBy: teacher._id,
      gradedAt,
    });
    await m.submissions.updateOne(
      { _id: s._id },
      {
        $set: { status: 'graded', currentGrade: { gradeId: g._id, score, gradedBy: teacher._id, gradedAt } },
        $inc: { version: 1 },
      },
    );
    gradesCount += 1;
  }

  // Лаб. 1 (срок прошел 10 дней назад): две версии, просрочка, переоценка
  const a1aig1 = await submit(a1, aigerim, at(-12));
  await grade(a1aig1, anna, 70, at(-11), 'Не хватает обработки ошибок');
  const a1aig2 = await submit(a1, aigerim, at(-10, -2));
  await grade(a1aig2, anna, 90, at(-9), 'Исправлено, хорошо');
  const a1dan = await submit(a1, daniyar, at(-9)); // с опозданием
  await grade(a1dan, anna, 60, at(-8), 'Сдано позже срока');
  const a1mar = await submit(a1, maria, at(-11));
  await grade(a1mar, anna, 85, at(-10));
  await grade(a1mar, anna, 88, at(-7), 'Пересмотр после апелляции');

  // Лаб. 2 (срок прошел 2 дня назад): оцененная v1 и неоцененные v2, v3 (v3 - просрочка)
  const a2aig = await submit(a2, aigerim, at(-3));
  await grade(a2aig, anna, 45, at(-1));
  const a2dan1 = await submit(a2, daniyar, at(-4));
  await grade(a2dan1, anna, 20, at(-3), 'Модуль не подключен к AppModule');
  await submit(a2, daniyar, at(-2, -12));
  await submit(a2, daniyar, at(-1)); // с опозданием, ожидает оценки
  // Мария не сдала - "не сдано, срок прошел"

  // Курсовой (срок через неделю): ожидают оценки
  await submit(a3, aigerim, at(-1));
  await submit(a3, daniyar, at(0, -3));

  // MongoDB
  const b1aig = await submit(b1, aigerim, at(-6));
  await grade(b1aig, anna, 28, at(-5, 2));
  const b1tim = await submit(b1, timur, at(-4)); // с опозданием
  await grade(b1tim, anna, 15, at(-3));
  const b1mar = await submit(b1, maria, at(-6));
  await grade(b1mar, anna, 25, at(-5));
  await submit(b2, timur, at(-1));

  // Дискретная математика (другой преподаватель)
  const c1dan = await submit(c1, daniyar, at(-4));
  await grade(c1dan, oleg, 8, at(-2));
  await submit(c1, timur, at(-2)); // с опозданием, ожидает оценки

  // guardVersion зачислений = число сдач студента в курсе
  for (const e of enrollments) {
    const count = guardCounter.get(`${e.courseId}:${e.studentId}`) ?? 0;
    if (count > 0) {
      await m.enrollments.updateOne({ _id: e._id }, { $set: { guardVersion: count } });
    }
  }

  // Отчисление Марии с курса MongoDB (ее работа и оценка остаются в истории)
  await m.enrollments.updateOne(
    { courseId: mongoCourse._id, studentId: maria._id },
    { $set: { status: 'removed', removedAt: at(-1), removeReason: 'Перевелась в другую группу' } },
  );

  return {
    users: created.length,
    courses: 3,
    enrollments: enrollments.length,
    assignments: 7,
    submissions: submissionsCount,
    grades: gradesCount,
  };
}

// Удаляет только демо-данные: пользователей @studytrack.demo и все, что с ними связано
async function removeDemoData(m: Models) {
  const demoUsers = await m.users.find({ email: DEMO_EMAIL }).select('_id role').lean();
  const userIds = demoUsers.map((u) => u._id);
  const teacherIds = demoUsers.filter((u) => u.role === 'teacher').map((u) => u._id);
  const courseIds = (await m.courses.find({ teacherId: { $in: teacherIds } }).select('_id').lean()).map((c) => c._id);

  const linked = { $or: [{ courseId: { $in: courseIds } }, { studentId: { $in: userIds } }] };
  await m.grades.deleteMany(linked);
  await m.submissions.deleteMany(linked);
  await m.enrollments.deleteMany(linked);
  await m.assignments.deleteMany({ courseId: { $in: courseIds } });
  await m.courses.deleteMany({ _id: { $in: courseIds } });

  // Демо-категорию нельзя удалять, если на нее ссылается чужой курс или чужая подкатегория
  const demoCategories = await m.categories.find({ createdBy: { $in: teacherIds } }).lean();
  const byId = new Map(demoCategories.map((c) => [String(c._id), c]));
  const blocked = new Set<string>();
  for (const c of demoCategories) {
    const usedByCourse = await m.courses.exists({ categoryId: c._id });
    const foreignChild = await m.categories.exists({ parentId: c._id, createdBy: { $nin: teacherIds } });
    if (usedByCourse || foreignChild) {
      // Вместе с категорией сохраняем и всех ее предков
      let current: (typeof demoCategories)[number] | undefined = c;
      while (current) {
        blocked.add(String(current._id));
        current = current.parentId ? byId.get(String(current.parentId)) : undefined;
      }
    }
  }
  const removable: Types.ObjectId[] = demoCategories.filter((c) => !blocked.has(String(c._id))).map((c) => c._id);
  await m.categories.deleteMany({ _id: { $in: removable } });
  if (blocked.size > 0) {
    console.warn(`Оставлено демо-категорий: ${blocked.size} (на них ссылаются рабочие данные)`);
  }

  await m.users.deleteMany({ _id: { $in: userIds } });
  console.log('Прежние демо-данные удалены');
}

main().catch((err: unknown) => {
  console.error(`Ошибка seed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
