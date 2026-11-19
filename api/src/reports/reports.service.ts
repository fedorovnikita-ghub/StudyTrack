import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Response } from 'express';
import { Model, Types } from 'mongoose';
import { pipeline } from 'node:stream/promises';
import { AuthUser } from '../auth/auth.types';
import { conflict } from '../common/app-error';
import { formatZoned, ReportPeriod, resolvePeriod } from '../common/dates';
import { loadNames } from '../common/names';
import { CourseAccessService } from '../courses/course-access.service';
import { percentOf } from '../grades/grade-rules';
import {
  Assignment,
  ASSIGNMENT_MODEL,
  Enrollment,
  ENROLLMENT_MODEL,
  Submission,
  SUBMISSION_MODEL,
  User,
  USER_MODEL,
} from '../models';
import { CSV_BOM, csvLine } from './csv';
import { ExportCsvQueryDto, ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { buildCourseReport, PairFact, ReportAssignment } from './report-calc';
import { ReportServiceClient } from './report-service.client';

// Ограничения объема отчетов
const MAX_ASSIGNMENTS = 200;
const MAX_STUDENTS = 2000;
const MAX_SUMMARY_FACTS = 5000;

// Строка агрегации: все версии пары студент-задание, свернутые в одну
interface PairAggregate {
  _id: { a: Types.ObjectId; s: Types.ObjectId };
  versions: number;
  hasOnTime: number;
  hasLate: number;
  gradedNumber: number;
  score: number | null;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger('Reports');

  constructor(
    @InjectModel(ASSIGNMENT_MODEL) private readonly assignments: Model<Assignment>,
    @InjectModel(ENROLLMENT_MODEL) private readonly enrollments: Model<Enrollment>,
    @InjectModel(SUBMISSION_MODEL) private readonly submissions: Model<Submission>,
    @InjectModel(USER_MODEL) private readonly users: Model<User>,
    private readonly access: CourseAccessService,
    private readonly reportService: ReportServiceClient,
  ) {}

  // Отчет "Сдаваемость, просрочки и текущие результаты" курса
  async courseReport(courseId: string, query: ReportPeriodQueryDto, user: AuthUser) {
    const course = await this.access.getOwnCourse(courseId, user);
    const period = resolvePeriod(query.from, query.to);
    const data = await this.loadFacts(courseId, period);

    const report = buildCourseReport(data.assignments, data.studentIds, data.facts, new Date());
    const names = await loadNames(this.users, data.studentIds, 'displayName');

    return {
      course: { id: String(course._id), title: course.title },
      period: { from: period.from, to: period.to },
      generatedAt: new Date().toISOString(),
      assignments: report.assignments,
      students: report.students
        .map((s) => ({ ...s, displayName: names.get(s.studentId) ?? '' }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru')),
      totals: report.totals,
    };
  }

  // Отчет "Средний балл по заданиям": расчет выполняет отдельный report-service.
  // Ему уходят только обезличенные факты { group: id задания, value: балл }, без студентов и текстов
  async summaryReport(courseId: string, query: ReportPeriodQueryDto, user: AuthUser) {
    await this.access.getOwnCourse(courseId, user);
    const period = resolvePeriod(query.from, query.to);
    const data = await this.loadFacts(courseId, period);

    const facts = data.facts
      .filter((f) => f.score !== null)
      .map((f) => ({ group: f.assignmentId, value: f.score as number }));
    if (facts.length > MAX_SUMMARY_FACTS) {
      throw conflict('REPORT_TOO_LARGE', `Слишком много оценок для отчета (больше ${MAX_SUMMARY_FACTS}). Сократите период`);
    }

    const items = await this.reportService.summarize(facts);
    const byGroup = new Map(items.map((i) => [i.group, i]));

    return {
      period: { from: period.from, to: period.to },
      factsCount: facts.length,
      items: data.assignments.map((a) => {
        const item = byGroup.get(a.id);
        return {
          assignment: { id: a.id, title: a.title, maxScore: a.maxScore, dueAt: a.dueAt.toISOString() },
          count: item?.count ?? 0,
          total: item?.total ?? 0,
          average: item ? item.average : null,
          averagePercent: item ? percentOf(item.average, a.maxScore) : null,
        };
      }),
    };
  }

  // Потоковая CSV-выгрузка журнала сдач курса за период (дата отбора - время сдачи).
  // Права и период проверяются ДО отправки заголовков, чтобы ошибка ушла обычным JSON
  async exportCsv(query: ExportCsvQueryDto, user: AuthUser, res: Response): Promise<void> {
    const course = await this.access.getOwnCourse(query.courseId, user);
    const period = resolvePeriod(query.from, query.to);

    const [assignmentList, enrollmentList] = await Promise.all([
      this.assignments.find({ courseId: course._id }).select('title dueAt maxScore').limit(MAX_ASSIGNMENTS * 5).lean(),
      this.enrollments.find({ courseId: course._id, status: 'active' }).select('studentId').limit(MAX_STUDENTS).lean(),
    ]);
    const assignmentsById = new Map(assignmentList.map((a) => [String(a._id), a]));
    const studentIds = enrollmentList.map((e) => e.studentId);
    const studentNames = await loadNames(this.users, studentIds, 'displayName');

    const cursor = this.submissions
      .find({
        courseId: course._id,
        studentId: { $in: studentIds },
        submittedAt: { $gte: period.start, $lt: period.end },
      })
      .sort({ submittedAt: 1, _id: 1 })
      .select('assignmentId studentId number submittedAt isLate currentGrade.score')
      .lean()
      .cursor({ batchSize: 200 });

    const fileName = `studytrack-${period.from}_${period.to}.csv`;
    res.status(200);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');

    // Источник - асинхронный генератор поверх курсора: следующая строка читается только
    // когда ответ готов принять данные (backpressure обеспечивает pipeline)
    async function* rows() {
      yield CSV_BOM +
        csvLine(['Курс', 'Задание', 'Срок (Алматы)', 'Студент', 'Версия', 'Сдано (Алматы)', 'С опозданием', 'Оценка версии', 'Макс. балл']);
      for await (const s of cursor) {
        const a = assignmentsById.get(String(s.assignmentId));
        yield csvLine([
          course.title,
          a?.title ?? '',
          a ? formatZoned(a.dueAt) : '',
          studentNames.get(String(s.studentId)) ?? '',
          s.number,
          formatZoned(s.submittedAt),
          s.isLate,
          s.currentGrade?.score ?? null,
          a?.maxScore ?? null,
        ]);
      }
    }

    try {
      await pipeline(rows, res);
    } catch (err) {
      // Заголовки уже отправлены: второй JSON-ответ невозможен, просто закрываем соединение
      const code = (err as { code?: string }).code;
      if (code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        this.logger.warn(`CSV-выгрузка прервана: ${err instanceof Error ? err.message : String(err)}`);
      }
      res.destroy();
    } finally {
      // При разрыве соединения курсор закрывается, чтобы не держать ресурсы MongoDB
      await cursor.close().catch(() => undefined);
    }
  }

  // Задания периода (по сроку), действующие студенты и свернутые факты сдач
  private async loadFacts(courseId: string, period: ReportPeriod) {
    const courseObjectId = new Types.ObjectId(courseId);
    const [assignmentList, enrollmentList] = await Promise.all([
      this.assignments
        .find({ courseId: courseObjectId, status: 'published', dueAt: { $gte: period.start, $lt: period.end } })
        .sort({ dueAt: 1, _id: 1 })
        .limit(MAX_ASSIGNMENTS)
        .select('title dueAt maxScore')
        .lean(),
      this.enrollments.find({ courseId: courseObjectId, status: 'active' }).select('studentId').limit(MAX_STUDENTS).lean(),
    ]);

    const assignments: ReportAssignment[] = assignmentList.map((a) => ({
      id: String(a._id),
      title: a.title,
      dueAt: a.dueAt,
      maxScore: a.maxScore,
    }));
    const studentIds = enrollmentList.map((e) => String(e.studentId));
    if (assignments.length === 0 || studentIds.length === 0) {
      return { assignments, studentIds, facts: [] as PairFact[] };
    }

    // Агрегация MongoDB сворачивает все версии в одну строку на пару студент-задание.
    // Отчисленные студенты (removed) в отчет не попадают
    const aggregated = await this.submissions.aggregate<PairAggregate>([
      {
        $match: {
          courseId: courseObjectId,
          assignmentId: { $in: assignmentList.map((a) => a._id) },
          studentId: { $in: enrollmentList.map((e) => e.studentId) },
        },
      },
      {
        $addFields: {
          gradedNumber: {
            $cond: [{ $in: [{ $type: '$currentGrade.score' }, ['int', 'long', 'double', 'decimal']] }, '$number', -1],
          },
        },
      },
      { $sort: { gradedNumber: -1 } }, // первой в группе окажется последняя оцененная версия
      {
        $group: {
          _id: { a: '$assignmentId', s: '$studentId' },
          versions: { $sum: 1 },
          hasOnTime: { $max: { $cond: ['$isLate', 0, 1] } },
          hasLate: { $max: { $cond: ['$isLate', 1, 0] } },
          gradedNumber: { $first: '$gradedNumber' },
          score: { $first: '$currentGrade.score' },
        },
      },
    ]);

    const facts: PairFact[] = aggregated.map((p) => ({
      assignmentId: String(p._id.a),
      studentId: String(p._id.s),
      versions: p.versions,
      hasOnTime: p.hasOnTime === 1,
      hasLate: p.hasLate === 1,
      score: p.gradedNumber > 0 && typeof p.score === 'number' ? p.score : null,
    }));
    return { assignments, studentIds, facts };
  }
}
