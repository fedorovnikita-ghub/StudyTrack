import { Module } from '@nestjs/common';
import { CourseAccessService } from './course-access.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { EnrollmentsService } from './enrollments.service';

// Основной предметный модуль: курсы и зачисления.
// CourseAccessService экспортируется для заданий, работ, GraphQL и Socket
@Module({
  controllers: [CoursesController],
  providers: [CoursesService, EnrollmentsService, CourseAccessService],
  exports: [CourseAccessService, CoursesService],
})
export class CoursesModule {}
