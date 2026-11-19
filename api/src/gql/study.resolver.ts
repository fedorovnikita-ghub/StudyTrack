import { Args, ID, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AssignmentsService } from '../assignments/assignments.service';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { AppError } from '../common/app-error';
import { CourseListQueryDto } from '../courses/dto/course-list-query.dto';
import { CoursesService } from '../courses/courses.service';
import { SubmissionListQueryDto } from '../submissions/dto/submission-list-query.dto';
import { SubmissionsService } from '../submissions/submissions.service';
import { AssignmentType, CoursePageType, GQL_MAX_LIMIT, PageArgs, SubmissionPageType } from './types';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// GraphQL не дублирует бизнес-логику: обе Query вызывают те же сервисы, что и REST,
// а значит - те же проверки входа, роли, членства и владельца
@Resolver(() => AssignmentType)
export class StudyResolver {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly assignmentsService: AssignmentsService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Query(() => CoursePageType, { description: 'Мои курсы: преподавателю свои, студенту те, куда он зачислен' })
  myCourses(@Args() args: PageArgs, @CurrentUser() user: AuthUser) {
    const query = Object.assign(new CourseListQueryDto(), { page: args.page, limit: args.limit });
    return this.coursesService.list(query, user);
  }

  @Query(() => AssignmentType, { description: 'Задание курса, доступного пользователю' })
  assignment(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: AuthUser) {
    if (!OBJECT_ID.test(id)) {
      throw new AppError(400, 'INVALID_ID', 'Неверный формат идентификатора');
    }
    return this.assignmentsService.getOne(id.toLowerCase(), user);
  }

  // Версии работ задания: студенту - только свои, преподавателю курса - все.
  // Один запрос на задание (не на каждую строку): права проверяет SubmissionsService
  @ResolveField(() => SubmissionPageType, { description: 'Студенту - свои версии, преподавателю - работы курса' })
  submissions(
    @Parent() assignment: AssignmentType,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @CurrentUser() user: AuthUser,
  ) {
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > GQL_MAX_LIMIT) {
      throw new AppError(400, 'VALIDATION_ERROR', `page от 1, limit от 1 до ${GQL_MAX_LIMIT}`);
    }
    const query = Object.assign(new SubmissionListQueryDto(), { page, limit });
    return this.submissionsService.list(assignment.id, query, user);
  }
}
