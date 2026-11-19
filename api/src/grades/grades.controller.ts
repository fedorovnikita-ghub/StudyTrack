import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { PageQueryDto } from '../common/pagination';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { GradingQueueQueryDto } from './dto/grading-queue-query.dto';
import { GradesService } from './grades.service';

@Controller()
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // POST /api/v1/submissions/:id/grade - оценка конкретной версии преподавателем курса
  @Post('submissions/:id/grade')
  @Roles('teacher')
  @HttpCode(200)
  grade(@Param('id', ObjectIdPipe) id: string, @Body() dto: GradeSubmissionDto, @CurrentUser() user: AuthUser) {
    return this.gradesService.grade(id, dto, user);
  }

  // GET /api/v1/grading/queue - кабинет оценивания преподавателя
  @Get('grading/queue')
  @Roles('teacher')
  queue(@Query() query: GradingQueueQueryDto, @CurrentUser() user: AuthUser) {
    return this.gradesService.queue(query, user);
  }

  // GET /api/v1/results/my - личные результаты студента
  @Get('results/my')
  @Roles('student')
  myResults(@Query() query: PageQueryDto, @CurrentUser() user: AuthUser) {
    return this.gradesService.myResults(query, user);
  }
}
