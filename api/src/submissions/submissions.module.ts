import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { CoursesModule } from '../courses/courses.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [CoursesModule, AssignmentsModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
