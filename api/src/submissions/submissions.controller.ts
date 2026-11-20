import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorExample, ApiErrors, ApiSuccess, EXAMPLES } from '../common/swagger';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionListQueryDto } from './dto/submission-list-query.dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('Сдача работ')
@ApiBearerAuth()
@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // POST /api/v1/assignments/:id/submissions - новая версия работы (зачисленный студент)
  @ApiOperation({
    summary: 'Главная команда: сдать новую версию работы (зачисленный студент)',
    description:
      'Транзакция: +1 к guardVersion зачисления -> следующий номер версии -> вставка версии. ' +
      'Номер, время сдачи и пометку isLate назначает сервер (ровно в срок - вовремя). После сохранения - событие submission.created.',
  })
  @ApiSuccess(201, 'Версия сохранена', EXAMPLES.submission)
  @ApiErrorExample(400, 'Текст короче минимума из settings задания или лишнее поле', {
    code: 'VALIDATION_ERROR',
    message: 'Текст работы не короче 50 символов',
    fields: { text: 'Текст работы не короче 50 символов' },
  })
  @ApiErrors(401)
  @ApiErrorExample(403, 'Преподаватель не сдает работы', { code: 'FORBIDDEN', message: 'Недостаточно прав для этого действия' })
  @ApiErrorExample(404, 'Задание чужого курса или студент отчислен', { code: 'NOT_FOUND', message: 'Задание не найдено' })
  @ApiErrorExample(409, 'Достигнут предел версий, задание закрыто или курс в архиве', {
    code: 'MAX_VERSIONS_REACHED',
    message: 'Достигнут предел версий для этого задания: 5',
  })
  @Post('assignments/:id/submissions')
  @Roles('student')
  @HttpCode(201)
  create(
    @Param('id', ObjectIdPipe) assignmentId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.submissionsService.create(assignmentId, dto, user);
  }

  // GET /api/v1/assignments/:id/submissions - свои версии студенту, все работы преподавателю курса
  @ApiOperation({ summary: 'Версии работ задания', description: 'Студенту - только свои версии (новые сверху), преподавателю курса - все работы с фильтрами status и studentId.' })
  @ApiSuccess(200, 'Страница версий', EXAMPLES.page(EXAMPLES.submission))
  @ApiErrors(400, 401, 404)
  @Get('assignments/:id/submissions')
  list(
    @Param('id', ObjectIdPipe) assignmentId: string,
    @Query() query: SubmissionListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.submissionsService.list(assignmentId, query, user);
  }

  // GET /api/v1/submissions/:id - полный текст версии
  @ApiOperation({ summary: 'Полный текст версии и история ее оценок', description: 'Автору (если зачислен) или преподавателю курса. Чужая работа - 404, текст не раскрывается.' })
  @ApiSuccess(200, 'Версия', { ...EXAMPLES.submission, text: 'Полный текст работы', grades: [], assignment: { id: EXAMPLES.assignment.id, title: EXAMPLES.assignment.title, maxScore: 100, dueAt: EXAMPLES.assignment.dueAt }, course: { id: EXAMPLES.course.id, title: EXAMPLES.course.title }, isCourseOwner: false })
  @ApiErrors(400, 401, 404)
  @Get('submissions/:id')
  getOne(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.submissionsService.getOne(id, user);
  }
}
