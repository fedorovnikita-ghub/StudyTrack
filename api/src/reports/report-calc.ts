// Расчет отчета "Сдаваемость, просрочки и текущие результаты" по уже сгруппированным фактам.
// Чистые функции без базы данных: те же правила проверяются unit-тестом на ручном примере (docs/reports.md)
import { percentOf } from '../grades/grade-rules';

export interface ReportAssignment {
  id: string;
  title: string;
  dueAt: Date;
  maxScore: number;
}

// Один факт = пара студент-задание, все версии уже свернуты агрегацией MongoDB
export interface PairFact {
  assignmentId: string;
  studentId: string;
  versions: number;
  hasOnTime: boolean; // есть хотя бы одна версия, сданная вовремя
  hasLate: boolean; // есть хотя бы одна версия с опозданием
  score: number | null; // оценка последней оцененной версии
}

export interface AssignmentRow {
  id: string;
  title: string;
  dueAt: string;
  maxScore: number;
  isOverdue: boolean;
  enrolled: number; // действующие студенты курса
  submitted: number; // сдали хотя бы одну версию
  onTime: number; // есть версия вовремя
  lateOnly: number; // сдали, но только с опозданием
  notSubmitted: number;
  missed: number; // не сдали, а срок уже прошел
  submissionRate: number | null; // submitted / enrolled, %
}

export interface StudentRow {
  studentId: string;
  totalScore: number; // сумма текущих оценок
  maxTotal: number; // сумма maxScore заданий периода
  percent: number | null;
  gradedCount: number;
  lateOnlyCount: number;
  missedCount: number;
}

export interface ReportTotals {
  assignments: number;
  enrolled: number;
  expected: number; // заданий x студентов
  submitted: number;
  onTime: number;
  lateOnly: number;
  notSubmitted: number;
  missed: number;
  submissionRate: number | null;
  averagePercent: number | null; // средний результат курса
}

export function buildCourseReport(
  assignments: ReportAssignment[],
  studentIds: string[],
  facts: PairFact[],
  now: Date,
): { assignments: AssignmentRow[]; students: StudentRow[]; totals: ReportTotals } {
  const byPair = new Map(facts.map((f) => [`${f.assignmentId}:${f.studentId}`, f]));
  const enrolled = studentIds.length;
  const maxTotal = assignments.reduce((sum, a) => sum + a.maxScore, 0);

  const assignmentRows: AssignmentRow[] = assignments.map((a) => {
    let submitted = 0;
    let onTime = 0;
    for (const studentId of studentIds) {
      const fact = byPair.get(`${a.id}:${studentId}`);
      if (!fact || fact.versions === 0) continue;
      submitted += 1;
      if (fact.hasOnTime) onTime += 1;
    }
    const isOverdue = now.getTime() > a.dueAt.getTime();
    const notSubmitted = enrolled - submitted;
    return {
      id: a.id,
      title: a.title,
      dueAt: a.dueAt.toISOString(),
      maxScore: a.maxScore,
      isOverdue,
      enrolled,
      submitted,
      onTime,
      lateOnly: submitted - onTime,
      notSubmitted,
      missed: isOverdue ? notSubmitted : 0,
      submissionRate: percentOf(submitted, enrolled),
    };
  });

  const studentRows: StudentRow[] = studentIds.map((studentId) => {
    let totalScore = 0;
    let gradedCount = 0;
    let lateOnlyCount = 0;
    let missedCount = 0;
    for (const a of assignments) {
      const fact = byPair.get(`${a.id}:${studentId}`);
      if (fact && fact.score !== null) {
        totalScore += fact.score;
        gradedCount += 1;
      }
      if (fact && fact.versions > 0 && !fact.hasOnTime) lateOnlyCount += 1;
      if ((!fact || fact.versions === 0) && now.getTime() > a.dueAt.getTime()) missedCount += 1;
    }
    return {
      studentId,
      totalScore,
      maxTotal,
      percent: percentOf(totalScore, maxTotal),
      gradedCount,
      lateOnlyCount,
      missedCount,
    };
  });

  const sum = (pick: (r: AssignmentRow) => number) => assignmentRows.reduce((s, r) => s + pick(r), 0);
  const expected = assignments.length * enrolled;
  const allScores = studentRows.reduce((s, r) => s + r.totalScore, 0);

  return {
    assignments: assignmentRows,
    students: studentRows,
    totals: {
      assignments: assignments.length,
      enrolled,
      expected,
      submitted: sum((r) => r.submitted),
      onTime: sum((r) => r.onTime),
      lateOnly: sum((r) => r.lateOnly),
      notSubmitted: sum((r) => r.notSubmitted),
      missed: sum((r) => r.missed),
      submissionRate: percentOf(sum((r) => r.submitted), expected),
      // Средний результат курса = все текущие баллы / (студенты x сумма maxScore заданий)
      averagePercent: percentOf(allScores, enrolled * maxTotal),
    },
  };
}
