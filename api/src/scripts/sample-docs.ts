// Выгрузка по два реальных документа каждой коллекции (из демо-данных) с пояснением ссылок.
//   npm run docs:samples   (сначала npm run seed)
// Только чтение. Хеши паролей в файл не попадают. Результат: docs/sample-documents.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { config } from '../config';

const DEMO_EMAIL = /@studytrack\.demo$/;
type Doc = Record<string, unknown>;

// Связи каждой коллекции: поле -> на что ссылается
const LINKS: Record<string, string[]> = {
  users: ['Ссылок нет. `email` уникален (индекс `uniq_email`), `passwordHash` в выгрузку не попадает'],
  categories: ['`parentId` → `categories._id` (родитель, `null` у верхнего уровня)', '`createdBy` → `users._id` (автор)'],
  courses: ['`categoryId` → `categories._id`', '`teacherId` → `users._id` (владелец курса)'],
  enrollments: ['`courseId` → `courses._id`', '`studentId` → `users._id`', '`enrolledBy` → `users._id` (преподаватель)'],
  assignments: ['`courseId` → `courses._id`', '`createdBy` → `users._id`', '`settings` — вложенный объект, не ссылка'],
  submissions: [
    '`assignmentId` → `assignments._id`',
    '`courseId` → `courses._id` (копия из задания)',
    '`studentId` → `users._id` (автор)',
    '`currentGrade.gradeId` → `grades._id`, `currentGrade.gradedBy` → `users._id`',
  ],
  grades: [
    '`submissionId` → `submissions._id` (оцененная версия)',
    '`assignmentId`, `courseId`, `studentId` — копии для отчетов',
    '`gradedBy` → `users._id`',
  ],
};

function toJson(doc: Doc): string {
  // Расширенный JSON MongoDB: ObjectId и даты видны явно ({ "$oid": ... }, { "$date": ... })
  return mongoose.mongo.BSON.EJSON.stringify(doc, undefined, 2, { relaxed: true });
}

async function main() {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10_000 });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Нет подключения к базе');
    const col = (name: string) => db.collection<Doc>(name);

    const demoUsers = await col('users').find({ email: DEMO_EMAIL }).project({ _id: 1, role: 1 }).toArray();
    if (demoUsers.length === 0) throw new Error('Демо-данных нет. Сначала выполните npm run seed');
    const teacherIds = demoUsers.filter((u) => u.role === 'teacher').map((u) => u._id);
    const courseIds = (await col('courses').find({ teacherId: { $in: teacherIds } }).project({ _id: 1 }).toArray()).map(
      (c) => c._id,
    );

    // По два показательных документа: разные роли, родитель и потомок, разные статусы
    const samples: Record<string, Doc[]> = {
      users: [
        ...(await col('users').find({ email: DEMO_EMAIL, role: 'teacher' }, { projection: { passwordHash: 0 } }).limit(1).toArray()),
        ...(await col('users').find({ email: DEMO_EMAIL, role: 'student' }, { projection: { passwordHash: 0 } }).limit(1).toArray()),
      ],
      categories: [
        ...(await col('categories').find({ createdBy: { $in: teacherIds }, parentId: null }).limit(1).toArray()),
        ...(await col('categories').find({ createdBy: { $in: teacherIds }, parentId: { $ne: null } }).limit(1).toArray()),
      ],
      courses: await col('courses').find({ _id: { $in: courseIds } }).limit(2).toArray(),
      enrollments: [
        ...(await col('enrollments').find({ courseId: { $in: courseIds }, status: 'active' }).limit(1).toArray()),
        ...(await col('enrollments').find({ courseId: { $in: courseIds }, status: 'removed' }).limit(1).toArray()),
      ],
      assignments: await col('assignments').find({ courseId: { $in: courseIds } }).sort({ dueAt: 1 }).limit(2).toArray(),
      submissions: [
        ...(await col('submissions').find({ courseId: { $in: courseIds }, status: 'graded' }).limit(1).toArray()),
        ...(await col('submissions').find({ courseId: { $in: courseIds }, isLate: true, status: 'submitted' }).limit(1).toArray()),
      ],
      grades: await col('grades').find({ courseId: { $in: courseIds } }).sort({ gradedAt: 1 }).limit(2).toArray(),
    };

    const lines = [
      '# Примеры реальных документов коллекций',
      '',
      `Выгружено командой \`npm run docs:samples\` из демо-данных (\`npm run seed\`), ${new Date().toISOString()}.`,
      'Формат — расширенный JSON MongoDB: `{"$oid": …}` — ObjectId, `{"$date": …}` — дата в UTC. Хеши паролей исключены.',
      '',
    ];
    for (const [name, docs] of Object.entries(samples)) {
      lines.push(`## ${name}`, '', '**Ссылки:**', '', ...LINKS[name].map((l) => `- ${l}`), '');
      docs.forEach((doc, i) => lines.push(`Документ ${i + 1}:`, '', '```json', toJson(doc), '```', ''));
    }

    const dir = join(process.cwd(), '..', 'docs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'sample-documents.md'), lines.join('\n'), 'utf8');
    console.log('Записано: docs/sample-documents.md');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
