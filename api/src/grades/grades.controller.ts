import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorExample, ApiErrors, ApiSuccess, EXAMPLES } from '../common/swagger';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { PageQueryDto } from '../common/pagination';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { GradingQueueQueryDto } from './dto/grading-queue-query.dto';
import { GradesService } from './grades.service';

@ApiTags('Оценивание и результаты')
@ApiBearerAuth()
@Controller()
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // POST /api/v1/submissions/:id/grade - оценка конкретной версии преподавателем курса
  @ApiOperation({ summary: 'Оценить конкретную версию (преподаватель курса)', description: 'Транзакция: условное обновление версии работы по version + запись в историю grades с той же датой. Событие grade.changed.' })
  @ApiSuccess(200, 'Оценка сохранена', { ...EXAMPLES.submission, status: 'graded', version: 2, currentGrade: { score: 85, gradedAt: '2026-11-20T07:00:00.000Z', gradedBy: { id: EXAMPLES.course.teacher.id, displayName: 'Анна Смирнова' } } })
  @ApiErrorExample(400, 'Балл вне диапазона 0..maxScore или не целый', { code: 'VALIDATION_ERROR', message: 'Балл - целое число от 0 до 100', fields: { score: 'Балл - целое число от 0 до 100' } })
  @ApiErrors(401, 403, 404)
  @ApiErrorExample(409, 'Работу уже оценили в другом окне (устаревшая version)', { code: 'VERSION_CONFLICT', message: 'Работу уже оценили в другом окне. Обновите данные и проверьте оценку' })
  @Post('submissions/:id/grade')
  @Roles('teacher')
  @HttpCode(200)
  grade(@Param('id', ObjectIdPipe) id: string, @Body() dto: GradeSubmissionDto, @CurrentUser() user: AuthUser) {
    return this.gradesService.grade(id, dto, user);
  }

  // GET /api/v1/grading/queue - кабинет оценивания преподавателя
  @ApiOperation({ summary: 'Кабинет оценивания: работы всех своих курсов (по умолчанию ожидающие)' })
  @ApiSuccess(200, 'Страница работ', EXAMPLES.page({ ...EXAMPLES.submission, assignment: { id: EXAMPLES.assignment.id, title: EXAMPLES.assignment.title, maxScore: 100 }, course: { id: EXAMPLES.course.id, title: EXAMPLES.course.title } }))
  @ApiErrors(400, 401, 403)
  @Get('grading/queue')
  @Roles('teacher')
  queue(@Query() query: GradingQueueQueryDto, @CurrentUser() user: AuthUser) {
    return this.gradesService.queue(query, user);
  }

  // GET /api/v1/results/my - личные результаты студента
  @ApiOperation({ summary: 'Личные результаты студента', description: 'Текущий балл по заданию = оценка последней оцененной версии.' })
  @ApiSuccess(200, 'Страница курсов с результатами', EXAMPLES.page({ course: { id: EXAMPLES.course.id, title: EXAMPLES.course.title }, assignments: [{ assignment: { id: EXAMPLES.assignment.id, title: EXAMPLES.assignment.title, maxScore: 100, dueAt: EXAMPLES.assignment.dueAt, isOverdue: false }, versionsCount: 2, lastSubmittedAt: '2026-11-20T06:30:00.000Z', hasLate: false, currentScore: 85, gradedVersion: 1 }], totalScore: 85, maxTotal: 100, gradedCount: 1, assignmentsCount: 1, percent: 85 }))
  @ApiErrors(400, 401, 403)
  @Get('results/my')
  @Roles('student')
  myResults(@Query() query: PageQueryDto, @CurrentUser() user: AuthUser) {
    return this.gradesService.myResults(query, user);
  }
}
