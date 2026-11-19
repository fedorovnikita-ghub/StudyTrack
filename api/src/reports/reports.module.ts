import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ReportServiceClient } from './report-service.client';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [CoursesModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportServiceClient],
})
export class ReportsModule {}
