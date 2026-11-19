import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
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

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // GET /api/v1/courses - мои курсы
  @Get()
  list(@Query() query: CourseListQueryDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.list(query, user);
  }

  // POST /api/v1/courses - создание курса преподавателем
  @Post()
  @Roles('teacher')
  @HttpCode(201)
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.create(dto, user);
  }

  // GET /api/v1/courses/:id - карточка курса (владелец или зачисленный студент)
  @Get(':id')
  getOne(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.getOne(id, user);
  }

  // PATCH /api/v1/courses/:id - редактирование с проверкой version
  @Patch(':id')
  @Roles('teacher')
  update(@Param('id', ObjectIdPipe) id: string, @Body() dto: UpdateCourseDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.update(id, dto, user);
  }

  // POST /api/v1/courses/:id/enrollments - зачисление студента по email
  @Post(':id/enrollments')
  @Roles('teacher')
  @HttpCode(201)
  enroll(@Param('id', ObjectIdPipe) id: string, @Body() dto: EnrollStudentDto, @CurrentUser() user: AuthUser) {
    return this.enrollmentsService.enroll(id, dto, user);
  }

  // GET /api/v1/courses/:id/enrollments - студенты курса
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
