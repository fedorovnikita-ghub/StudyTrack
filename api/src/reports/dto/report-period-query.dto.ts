import { IsMongoId, IsOptional, Matches } from 'class-validator';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Календарные даты по времени Алматы, обе включительно. Период не длиннее 90 дней (проверка в resolvePeriod)
export class ReportPeriodQueryDto {
  @IsOptional()
  @Matches(CALENDAR_DATE, { message: 'Дата в формате ГГГГ-ММ-ДД' })
  from?: string;

  @IsOptional()
  @Matches(CALENDAR_DATE, { message: 'Дата в формате ГГГГ-ММ-ДД' })
  to?: string;
}

export class ExportCsvQueryDto extends ReportPeriodQueryDto {
  @IsMongoId({ message: 'Укажите курс' })
  courseId: string;
}
