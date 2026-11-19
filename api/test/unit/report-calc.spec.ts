import { buildCourseReport, PairFact, ReportAssignment } from '../../src/reports/report-calc';

// Ручной пример из docs/reports.md: 2 задания, 3 студента, 4 факта
describe('Отчет "Сдаваемость и результаты" (unit, ручной пример)', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const assignments: ReportAssignment[] = [
    { id: 'A', title: 'Задание A', dueAt: new Date('2026-11-10T18:59:00Z'), maxScore: 10 }, // срок прошел
    { id: 'B', title: 'Задание B', dueAt: new Date('2026-11-30T18:59:00Z'), maxScore: 20 }, // срок впереди
  ];
  const students = ['s1', 's2', 's3'];
  const facts: PairFact[] = [
    { assignmentId: 'A', studentId: 's1', versions: 1, hasOnTime: true, hasLate: false, score: 8 },
    { assignmentId: 'A', studentId: 's2', versions: 2, hasOnTime: false, hasLate: true, score: 6 },
    { assignmentId: 'B', studentId: 's1', versions: 1, hasOnTime: true, hasLate: false, score: null },
    { assignmentId: 'B', studentId: 's3', versions: 1, hasOnTime: true, hasLate: false, score: 15 },
  ];

  const report = buildCourseReport(assignments, students, facts, now);

  it('по заданиям: сдали, вовремя, только с опозданием, пропуск срока', () => {
    expect(report.assignments[0]).toMatchObject({
      enrolled: 3,
      submitted: 2,
      onTime: 1,
      lateOnly: 1,
      notSubmitted: 1,
      missed: 1,
      submissionRate: 66.7,
    });
    // У B срок не прошел: несдавший не считается пропустившим
    expect(report.assignments[1]).toMatchObject({ submitted: 2, onTime: 2, lateOnly: 0, notSubmitted: 1, missed: 0 });
  });

  it('по студентам: сумма текущих баллов и процент от суммы максимумов (30)', () => {
    const byId = Object.fromEntries(report.students.map((s) => [s.studentId, s]));
    expect(byId.s1).toMatchObject({ totalScore: 8, maxTotal: 30, percent: 26.7, gradedCount: 1 });
    expect(byId.s2).toMatchObject({ totalScore: 6, percent: 20, lateOnlyCount: 1 });
    expect(byId.s3).toMatchObject({ totalScore: 15, percent: 50, missedCount: 1 });
  });

  it('итоги курса: 4 сдачи из 6 ожидаемых, средний результат 29 / 90 = 32.2%', () => {
    expect(report.totals).toMatchObject({
      expected: 6,
      submitted: 4,
      onTime: 3,
      lateOnly: 1,
      notSubmitted: 2,
      missed: 1,
      submissionRate: 66.7,
      averagePercent: 32.2,
    });
  });

  it('нулевой результат: нет студентов или заданий - проценты null, а не NaN', () => {
    const empty = buildCourseReport([], [], [], now);
    expect(empty.totals).toMatchObject({ expected: 0, submitted: 0, submissionRate: null, averagePercent: null });
    const noStudents = buildCourseReport(assignments, [], [], now);
    expect(noStudents.assignments[0].submissionRate).toBeNull();
  });
});
