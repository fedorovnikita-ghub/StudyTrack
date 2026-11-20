// Эксперимент explain: один и тот же запрос до и после создания индекса на 5000 связанных фактах.
//   npm run perf:explain
// Работает ТОЛЬКО в тестовой базе (MONGODB_URI_TEST, имя на _test) в отдельной коллекции explain_submissions.
// Результат печатается и записывается в docs/perf/explain-results.md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import mongoose, { Types } from 'mongoose';

if (existsSync('.env')) {
  const values = parseEnv(readFileSync('.env', 'utf8'));
  for (const [k, v] of Object.entries(values)) if (process.env[k] === undefined && v !== undefined) process.env[k] = v;
}

const ASSIGNMENTS = 50;
const STUDENTS = 100; // 50 x 100 = 5000 версий работ
const COLLECTION = 'explain_submissions';

interface PlanInfo {
  stage: string;
  index: string;
  docsExamined: number;
  keysExamined: number;
  returned: number;
  ms: number;
}

interface PlanNode {
  stage?: string;
  indexName?: string;
  inputStage?: PlanNode;
  inputStages?: PlanNode[];
  queryPlan?: PlanNode;
}

interface ExplainResult {
  queryPlanner?: { winningPlan?: PlanNode };
  executionStats?: {
    totalDocsExamined?: number;
    totalKeysExamined?: number;
    nReturned?: number;
    executionTimeMillis?: number;
  };
}

// Стадии плана: COLLSCAN (полный просмотр) или IXSCAN (по индексу)
function describePlan(explain: ExplainResult): PlanInfo {
  const stages: string[] = [];
  let index = '-';
  const walk = (node: PlanNode | undefined) => {
    if (!node) return;
    if (node.stage) stages.push(node.stage);
    if (node.indexName) index = node.indexName;
    walk(node.inputStage);
    (node.inputStages ?? []).forEach(walk);
  };
  walk(explain.queryPlanner?.winningPlan?.queryPlan ?? explain.queryPlanner?.winningPlan);
  const stats = explain.executionStats ?? {};
  return {
    stage: stages.join(' → '),
    index,
    docsExamined: stats.totalDocsExamined ?? 0,
    keysExamined: stats.totalKeysExamined ?? 0,
    returned: stats.nReturned ?? 0,
    ms: stats.executionTimeMillis ?? 0,
  };
}

async function main() {
  const uri = process.env.MONGODB_URI_TEST?.trim();
  if (!uri || !new URL(uri).pathname.replace('/', '').endsWith('_test')) {
    throw new Error('Нужна MONGODB_URI_TEST с базой на _test: эксперимент пересоздает свою коллекцию');
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Нет подключения к базе');
    const col = db.collection(COLLECTION);
    await col.drop().catch(() => undefined);

    // Связанные факты: курс -> 50 заданий -> 100 студентов, по одной версии на пару
    const courseId = new Types.ObjectId();
    const assignmentIds = Array.from({ length: ASSIGNMENTS }, () => new Types.ObjectId());
    const studentIds = Array.from({ length: STUDENTS }, () => new Types.ObjectId());
    const start = Date.now() - 30 * 24 * 3600 * 1000;
    const docs = assignmentIds.flatMap((assignmentId, a) =>
      studentIds.map((studentId, s) => ({
        assignmentId,
        courseId,
        studentId,
        number: 1,
        text: `Работа ${a}-${s}`,
        submittedAt: new Date(start + (a * STUDENTS + s) * 60_000),
        isLate: s % 7 === 0,
        status: 'submitted',
        currentGrade: null,
        version: 1,
      })),
    );
    for (let i = 0; i < docs.length; i += 1000) {
      await col.insertMany(docs.slice(i, i + 1000));
    }

    // Запрос 1: последняя версия студента по заданию (шаг сдачи работы)
    const q1 = { filter: { assignmentId: assignmentIds[10], studentId: studentIds[42] }, sort: { number: -1 } as const };
    // Запрос 2: работы курса за 3 дня (отчет и CSV)
    const from = new Date(start + 1000 * 60_000);
    const to = new Date(from.getTime() + 3 * 24 * 3600 * 1000);
    const q2 = { filter: { courseId, submittedAt: { $gte: from, $lt: to } }, sort: { submittedAt: 1 } as const };

    const explainOf = async (q: { filter: object; sort: Record<string, 1 | -1> }) =>
      describePlan((await col.find(q.filter).sort(q.sort).explain('executionStats')) as ExplainResult);

    const before1 = await explainOf(q1);
    const before2 = await explainOf(q2);

    // Те же индексы, что в схеме submissions
    await col.createIndex({ assignmentId: 1, studentId: 1, number: 1 }, { name: 'uniq_submission_number', unique: true });
    await col.createIndex({ courseId: 1, submittedAt: -1 }, { name: 'course_submissions_by_time' });

    const after1 = await explainOf(q1);
    const after2 = await explainOf(q2);

    const rows = [
      { query: '1. версии студента по заданию', when: 'до индекса', ...before1 },
      { query: '1. версии студента по заданию', when: 'после индекса', ...after1 },
      { query: '2. работы курса за 3 дня', when: 'до индекса', ...before2 },
      { query: '2. работы курса за 3 дня', when: 'после индекса', ...after2 },
    ];
    console.table(rows);

    const verdict = (before: PlanInfo, after: PlanInfo) =>
      after.stage.includes('IXSCAN')
        ? `индекс \`${after.index}\` выбран: просмотрено документов ${before.docsExamined} → ${after.docsExamined}`
        : 'индекс НЕ выбран планировщиком - ускорения нет';

    const md = [
      '# Эксперимент explain: запросы до и после индекса',
      '',
      `Дата: ${new Date().toISOString()}. База: тестовая (\`${new URL(uri).pathname.slice(1)}\`), коллекция \`${COLLECTION}\`.`,
      '',
      `Набор: ${docs.length} связанных версий работ (1 курс, ${ASSIGNMENTS} заданий, ${STUDENTS} студентов).`,
      '',
      '**Запрос 1** (сдача работы, поиск последнего номера версии):',
      '`find({ assignmentId, studentId }).sort({ number: -1 })`',
      '',
      '**Запрос 2** (отчет и CSV за период):',
      '`find({ courseId, submittedAt: { $gte, $lt } }).sort({ submittedAt: 1 })`',
      '',
      '| Запрос | Когда | План | Индекс | docsExamined | keysExamined | returned | мс |',
      '|---|---|---|---|---|---|---|---|',
      ...rows.map(
        (r) =>
          `| ${r.query} | ${r.when} | ${r.stage} | ${r.index} | ${r.docsExamined} | ${r.keysExamined} | ${r.returned} | ${r.ms} |`,
      ),
      '',
      `- Запрос 1: ${verdict(before1, after1)}.`,
      `- Запрос 2: ${verdict(before2, after2)}.`,
      '',
      'Время выполнения на маленьком наборе может почти не отличаться. Главный показатель - сколько документов просмотрено ради результата (docsExamined против returned).',
      '',
    ].join('\n');
    const dir = join(process.cwd(), '..', 'docs', 'perf');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'explain-results.md'), md, 'utf8');
    console.log('Записано: docs/perf/explain-results.md');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
