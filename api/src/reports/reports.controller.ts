import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorExample, ApiErrors, ApiSuccess } from '../common/swagger';
import type { Response } from 'express';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { ExportCsvQueryDto, ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('Отчеты')
@ApiBearerAuth()
@Controller()
@Roles('teacher')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // GET /api/v1/courses/:id/report - сдаваемость, просрочки и текущие результаты курса
  @ApiOperation({ summary: 'Сдаваемость, просрочки и текущие результаты курса', description: 'from/to - календарные даты YYYY-MM-DD по Алматы, включительно, не длиннее 90 дней. Формулы - в docs/reports.md.' })
  @ApiSuccess(200, 'Отчет')
  @ApiErrors(400, 401, 403, 404)
  @Get('courses/:id/report')
  courseReport(
    @Param('id', ObjectIdPipe) courseId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.courseReport(courseId, query, user);
  }

  // GET /api/v1/courses/:id/report/summary - средний балл по заданиям через report-service
  @ApiOperation({ summary: 'Средний балл по заданиям через report-service', description: 'API отправляет сервису только обезличенные факты {group, value}. Ожидание не дольше 3 секунд.' })
  @ApiSuccess(200, 'Сводка')
  @ApiErrors(400, 401, 403, 404)
  @ApiErrorExample(503, 'report-service недоступен: отказ только этого отчета', { code: 'REPORT_SERVICE_UNAVAILABLE', message: 'Сервис отчетов временно недоступен. Остальные функции сайта работают, повторите позже' })
  @Get('courses/:id/report/summary')
  summary(
    @Param('id', ObjectIdPipe) courseId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.summaryReport(courseId, query, user);
  }

  // GET /api/v1/reports/export.csv?courseId=...&from=...&to=... - потоковая выгрузка журнала сдач
  @ApiOperation({ summary: 'Потоковая CSV-выгрузка журнала сдач курса', description: 'UTF-8 с BOM, разделитель ";". Права и период проверяются до заголовков, ошибки до начала потока - JSON.' })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV-файл', content: { 'text/csv': { schema: { type: 'string', example: 'Курс;Задание;Срок (Алматы);Студент;Версия;Сдано (Алматы);С опозданием;Оценка версии;Макс. балл' } } } })
  @ApiErrors(400, 401, 403, 404)
  @Get('reports/export.csv')
  async exportCsv(
    @Query() query: ExportCsvQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    await this.reportsService.exportCsv(query, user, res);
  }
}
