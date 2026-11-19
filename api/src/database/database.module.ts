import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ASSIGNMENT_MODEL,
  AssignmentSchema,
  CATEGORY_MODEL,
  CategorySchema,
  COURSE_MODEL,
  CourseSchema,
  ENROLLMENT_MODEL,
  EnrollmentSchema,
  GRADE_MODEL,
  GradeSchema,
  SUBMISSION_MODEL,
  SubmissionSchema,
  USER_MODEL,
  UserSchema,
} from '../models';
import { IndexesService } from './indexes.service';

// Все модели регистрируются один раз и доступны в любом модуле через @InjectModel
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: UserSchema },
      { name: CATEGORY_MODEL, schema: CategorySchema },
      { name: COURSE_MODEL, schema: CourseSchema },
      { name: ENROLLMENT_MODEL, schema: EnrollmentSchema },
      { name: ASSIGNMENT_MODEL, schema: AssignmentSchema },
      { name: SUBMISSION_MODEL, schema: SubmissionSchema },
      { name: GRADE_MODEL, schema: GradeSchema },
    ]),
  ],
  providers: [IndexesService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
