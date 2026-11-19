'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import QueryView from '@/components/ui/QueryView';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { downloadFile } from '@/lib/download';
import { addDays, formatDateTime, periodDays, TIME_ZONE_LABEL, todayAlmaty } from '@/lib/format';
import { buildQuery } from '@/lib/query-string';
import { CourseReport } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';
import ReportTables from './ReportTables';
import SummarySection from './SummarySection';

const MAX_DAYS = 90;

// Отчет курса: сдаваемость, просрочки, текущие результаты, средние (report-service) и CSV
export default function ReportView({ courseId }: { courseId: string }) {
  const { token } = useAuth();
  const today = todayAlmaty();
  // Тот же период по умолчанию, что на сервере: 60 дней назад - 29 дней вперед
  const [fromDraft, setFromDraft] = useState(addDays(today, -60));
  const [toDraft, setToDraft] = useState(addDays(today, 29));
  const [period, setPeriod] = useState({ from: fromDraft, to: toDraft });
  const [fields, setFields] = useState<FieldErrors>({});
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvPending, setCsvPending] = useState(false);

  const query = buildQuery(period);
  const report = useApiQuery<CourseReport>(`/courses/${encodeURIComponent(courseId)}/report${query}`);

  function handleApply(e: FormEvent) {
    e.preventDefault();
    const errors: FieldErrors = {};
    if (!fromDraft) errors.from = 'Укажите дату начала';
    if (!toDraft) errors.to = 'Укажите дату окончания';
    if (fromDraft && toDraft) {
      const days = periodDays(fromDraft, toDraft);
      if (days < 1) errors.to = 'Дата окончания раньше даты начала';
      else if (days > MAX_DAYS) errors.to = `Период не длиннее ${MAX_DAYS} дней`;
    }
    setFields(errors);
    if (Object.keys(errors).length === 0) setPeriod({ from: fromDraft, to: toDraft });
  }

  async function handleCsv() {
    if (csvPending) return;
    setCsvError(null);
    setCsvPending(true);
    try {
      await downloadFile(
        `/reports/export.csv${buildQuery({ courseId, ...period })}`,
        token,
        `studytrack-${period.from}_${period.to}.csv`,
      );
    } catch (err) {
      setCsvError(err instanceof ApiError ? err.message : 'Не удалось скачать CSV');
    } finally {
      setCsvPending(false);
    }
  }

  return (
    <div className="stack">
      <p>
        <Link href={`/courses/${courseId}`}>← К курсу</Link>
      </p>

      <section className="card stack">
        <h1>Отчет курса</h1>
        <form className="filters" onSubmit={handleApply} noValidate>
          <TextField
            label="С даты"
            name="from"
            type="date"
            value={fromDraft}
            onChange={setFromDraft}
            error={fields.from}
            hint="Включительно"
          />
          <TextField
            label="По дату"
            name="to"
            type="date"
            value={toDraft}
            onChange={setToDraft}
            error={fields.to}
            hint={`Включительно, не длиннее ${MAX_DAYS} дней`}
          />
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Построить
            </button>
            <button type="button" className="btn" onClick={handleCsv} disabled={csvPending}>
              {csvPending ? 'Готовим файл…' : 'Скачать CSV'}
            </button>
          </div>
        </form>
        {csvError && <Alert kind="error">{csvError}</Alert>}
        <p className="muted">
          Задания отбираются по сроку сдачи в выбранном периоде ({TIME_ZONE_LABEL}). Учитываются только действующие
          студенты курса. CSV — журнал всех версий работ, сданных за период.
        </p>
      </section>

      <QueryView query={report} notFoundText="Курс не найден или у вас нет к нему доступа">
        {(data) => (
          <>
            <p className="muted">
              {data.course.title} · период {data.period.from} — {data.period.to} · построен{' '}
              {formatDateTime(data.generatedAt)}
            </p>
            <ReportTables report={data} />
          </>
        )}
      </QueryView>

      <SummarySection courseId={courseId} query={query} />
    </div>
  );
}
