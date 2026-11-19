import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { ExportCsvQueryDto, ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { ReportsService } from './reports.service';

@Controller()
@Roles('teacher')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // GET /api/v1/courses/:id/report - сдаваемость, просрочки и текущие результаты курса
  @Get('courses/:id/report')
  courseReport(
    @Param('id', ObjectIdPipe) courseId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.courseReport(courseId, query, user);
  }

  // GET /api/v1/courses/:id/report/summary - средний балл по заданиям через report-service
  @Get('courses/:id/report/summary')
  summary(
    @Param('id', ObjectIdPipe) courseId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.summaryReport(courseId, query, user);
  }

  // GET /api/v1/reports/export.csv?courseId=...&from=...&to=... - потоковая выгрузка журнала сдач
  @Get('reports/export.csv')
  async exportCsv(
    @Query() query: ExportCsvQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    await this.reportsService.exportCsv(query, user, res);
  }
}
