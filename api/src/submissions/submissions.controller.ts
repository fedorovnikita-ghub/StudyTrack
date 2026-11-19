import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionListQueryDto } from './dto/submission-list-query.dto';
import { SubmissionsService } from './submissions.service';

@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // POST /api/v1/assignments/:id/submissions - новая версия работы (зачисленный студент)
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
  @Get('assignments/:id/submissions')
  list(
    @Param('id', ObjectIdPipe) assignmentId: string,
    @Query() query: SubmissionListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.submissionsService.list(assignmentId, query, user);
  }

  // GET /api/v1/submissions/:id - полный текст версии
  @Get('submissions/:id')
  getOne(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.submissionsService.getOne(id, user);
  }
}
