import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { AssignmentsService } from './assignments.service';
import { AssignmentListQueryDto } from './dto/assignment-list-query.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // POST /api/v1/courses/:id/assignments - новое задание (владелец курса)
  @Post('courses/:id/assignments')
  @Roles('teacher')
  @HttpCode(201)
  create(@Param('id', ObjectIdPipe) courseId: string, @Body() dto: CreateAssignmentDto, @CurrentUser() user: AuthUser) {
    return this.assignmentsService.create(courseId, dto, user);
  }

  // GET /api/v1/courses/:id/assignments - задания курса
  @Get('courses/:id/assignments')
  list(
    @Param('id', ObjectIdPipe) courseId: string,
    @Query() query: AssignmentListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assignmentsService.list(courseId, query, user);
  }

  // GET /api/v1/assignments/:id - карточка задания
  @Get('assignments/:id')
  getOne(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.assignmentsService.getOne(id, user);
  }
}
