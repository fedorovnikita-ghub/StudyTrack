import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { config } from './config';
import { CoursesModule } from './courses/courses.module';
import { DatabaseModule } from './database/database.module';
import { GradesModule } from './grades/grades.module';
import { HealthController } from './health/health.controller';
import { ReportsModule } from './reports/reports.module';
import { SubmissionsModule } from './submissions/submissions.module';

@Module({
  imports: [
    MongooseModule.forRoot(config.mongodbUri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 20,
    }),
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    CoursesModule,
    AssignmentsModule,
    SubmissionsModule,
    GradesModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
