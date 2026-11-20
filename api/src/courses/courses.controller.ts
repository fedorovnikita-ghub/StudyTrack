import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorExample, ApiErrors, ApiSuccess, EXAMPLES } from '../common/swagger';
import type { Response } from 'express';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { CoursesService } from './courses.service';
import { CourseListQueryDto } from './dto/course-list-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { EnrollmentListQueryDto } from './dto/enrollment-list-query.dto';
import { RemoveEnrollmentDto } from './dto/remove-enrollment.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('Курсы и зачисления')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // GET /api/v1/courses - мои курсы
  @ApiOperation({ summary: 'Мои курсы', description: 'Преподавателю - свои курсы, студенту - курсы с действующим зачислением.' })
  @ApiSuccess(200, 'Страница курсов', EXAMPLES.page(EXAMPLES.course))
  @ApiErrors(400, 401)
  @Get()
  list(@Query() query: CourseListQueryDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.list(query, user);
  }

  // POST /api/v1/courses - создание курса преподавателем
  @ApiOperation({ summary: 'Создать курс (преподаватель)', description: 'Владелец, статус и version назначает сервер.' })
  @ApiSuccess(201, 'Курс создан', EXAMPLES.course)
  @ApiErrors(400, 401, 403)
  @Post()
  @Roles('teacher')
  @HttpCode(201)
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.create(dto, user);
  }

  // GET /api/v1/courses/:id - карточка курса (владелец или зачисленный студент)
  @ApiOperation({ summary: 'Карточка курса', description: 'Владелец или зачисленный студент. Заголовок X-Cache: HIT|MISS - кеш общей части на 60 секунд.' })
  @ApiSuccess(200, 'Курс', { ...EXAMPLES.course, isOwner: true, studentsCount: 3 })
  @ApiErrors(401)
  @ApiErrorExample(400, 'Неверный формат id', { code: 'INVALID_ID', message: 'Неверный формат идентификатора' })
  @ApiErrorExample(404, 'Курса нет или он чужой', { code: 'NOT_FOUND', message: 'Курс не найден' })
  @Get(':id')
  async getOne(
    @Param('id', ObjectIdPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { course, cacheHit } = await this.coursesService.getOne(id, user);
    res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS'); // видно в DevTools -> Network
    return course;
  }

  // PATCH /api/v1/courses/:id - редактирование с проверкой version
  @ApiOperation({ summary: 'Изменить курс (владелец)', description: 'Обязательно поле version, которое видел пользователь. Устаревшая форма получает 409.' })
  @ApiSuccess(200, 'Курс изменен, version + 1', { ...EXAMPLES.course, version: 2 })
  @ApiErrors(400, 401, 403, 404)
  @ApiErrorExample(409, 'Курс уже изменили в другом окне', { code: 'VERSION_CONFLICT', message: 'Курс уже изменили в другом окне. Обновите данные и повторите' })
  @Patch(':id')
  @Roles('teacher')
  update(@Param('id', ObjectIdPipe) id: string, @Body() dto: UpdateCourseDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.update(id, dto, user);
  }

  // POST /api/v1/courses/:id/enrollments - зачисление студента по email
  @ApiOperation({ summary: 'Зачислить студента по email (владелец курса)' })
  @ApiSuccess(201, 'Студент зачислен', EXAMPLES.enrollment)
  @ApiErrors(400, 401, 403)
  @ApiErrorExample(404, 'Курс чужой или студента с таким email нет', { code: 'STUDENT_NOT_FOUND', message: 'Студент с таким email не найден', fields: { email: 'Студент с таким email не найден' } })
  @ApiErrorExample(409, 'Уже зачислен или курс в архиве', { code: 'ALREADY_ENROLLED', message: 'Студент уже зачислен на этот курс' })
  @Post(':id/enrollments')
  @Roles('teacher')
  @HttpCode(201)
  enroll(@Param('id', ObjectIdPipe) id: string, @Body() dto: EnrollStudentDto, @CurrentUser() user: AuthUser) {
    return this.enrollmentsService.enroll(id, dto, user);
  }

  // GET /api/v1/courses/:id/enrollments - студенты курса
  @ApiOperation({ summary: 'Студенты курса (владелец)' })
  @ApiSuccess(200, 'Страница зачислений', EXAMPLES.page(EXAMPLES.enrollment))
  @ApiErrors(400, 401, 403, 404)
  @Get(':id/enrollments')
  @Roles('teacher')
  listEnrollments(
    @Param('id', ObjectIdPipe) id: string,
    @Query() query: EnrollmentListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enrollmentsService.list(id, query, user);
  }

  // POST /api/v1/courses/:id/enrollments/:enrollmentId/remove - отчисление с причиной
  @ApiOperation({ summary: 'Отчислить студента с причиной (владелец)', description: 'Запись остается в истории со статусом removed, доступ к курсу закрывается сразу.' })
  @ApiSuccess(200, 'Студент отчислен', { ...EXAMPLES.enrollment, status: 'removed', removedAt: '2026-11-20T06:00:00.000Z', removeReason: 'Перевелся в другую группу' })
  @ApiErrors(400, 401, 403, 404)
  @ApiErrorExample(409, 'Уже отчислен: повторный запрос ничего не меняет', { code: 'ALREADY_REMOVED', message: 'Студент уже отчислен с курса' })
  @Post(':id/enrollments/:enrollmentId/remove')
  @Roles('teacher')
  @HttpCode(200)
  removeEnrollment(
    @Param('id', ObjectIdPipe) id: string,
    @Param('enrollmentId', ObjectIdPipe) enrollmentId: string,
    @Body() dto: RemoveEnrollmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enrollmentsService.remove(id, enrollmentId, dto, user);
  }
}
