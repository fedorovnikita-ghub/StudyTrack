import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorExample, ApiErrors, ApiSuccess, EXAMPLES } from '../common/swagger';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { AssignmentsService } from './assignments.service';
import { AssignmentListQueryDto } from './dto/assignment-list-query.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@ApiTags('Задания')
@ApiBearerAuth()
@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // POST /api/v1/courses/:id/assignments - новое задание (владелец курса)
  @ApiOperation({ summary: 'Создать задание (владелец курса)', description: 'dueAt - ISO 8601 с часовым поясом, в будущем и не дальше двух лет. settings - вложенные параметры.' })
  @ApiSuccess(201, 'Задание создано', EXAMPLES.assignment)
  @ApiErrors(401, 403, 404)
  @ApiErrorExample(400, 'Ошибка полей, например срок без часового пояса', { code: 'VALIDATION_ERROR', message: 'Проверьте правильность заполнения полей', fields: { dueAt: 'Срок должен содержать часовой пояс' } })
  @ApiErrorExample(409, 'Курс в архиве', { code: 'COURSE_ARCHIVED', message: 'Курс в архиве, новые задания добавить нельзя' })
  @Post('courses/:id/assignments')
  @Roles('teacher')
  @HttpCode(201)
  create(@Param('id', ObjectIdPipe) courseId: string, @Body() dto: CreateAssignmentDto, @CurrentUser() user: AuthUser) {
    return this.assignmentsService.create(courseId, dto, user);
  }

  // GET /api/v1/courses/:id/assignments - задания курса
  @ApiOperation({ summary: 'Задания курса по сроку', description: 'Студенту дополнительно сводка его сдач (поле my).' })
  @ApiSuccess(200, 'Страница заданий', EXAMPLES.page({ ...EXAMPLES.assignment, my: { submissionsCount: 2, lastSubmittedAt: '2026-11-20T06:30:00.000Z' } }))
  @ApiErrors(400, 401, 404)
  @Get('courses/:id/assignments')
  list(
    @Param('id', ObjectIdPipe) courseId: string,
    @Query() query: AssignmentListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assignmentsService.list(courseId, query, user);
  }

  // GET /api/v1/assignments/:id - карточка задания
  @ApiOperation({ summary: 'Карточка задания' })
  @ApiSuccess(200, 'Задание', { ...EXAMPLES.assignment, course: { id: EXAMPLES.course.id, title: EXAMPLES.course.title }, isOwner: false })
  @ApiErrors(400, 401, 404)
  @Get('assignments/:id')
  getOne(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.assignmentsService.getOne(id, user);
  }
}
