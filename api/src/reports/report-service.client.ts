import { Injectable, Logger } from '@nestjs/common';
import { serviceUnavailable } from '../common/app-error';
import { config } from '../config';

export interface SummaryFact {
  group: string;
  value: number;
}

export interface SummaryItem {
  group: string;
  count: number;
  total: number;
  average: number;
}

const UNAVAILABLE_MESSAGE = 'Сервис отчетов временно недоступен. Остальные функции сайта работают, повторите позже';

function isSummaryItem(x: unknown): x is SummaryItem {
  if (typeof x !== 'object' || x === null) return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.group === 'string' &&
    Number.isInteger(v.count) &&
    typeof v.total === 'number' &&
    Number.isFinite(v.total) &&
    typeof v.average === 'number' &&
    Number.isFinite(v.average)
  );
}

// HTTP-клиент отдельного report-service. Вызывается только сервером после проверки прав.
// Ожидание ограничено 3 секундами; любой сбой - 503 только для этого отчета
@Injectable()
export class ReportServiceClient {
  private readonly logger = new Logger('ReportService');

  async summarize(facts: SummaryFact[]): Promise<SummaryItem[]> {
    const { url, key, timeoutMs } = config.reportService;
    if (!key) {
      this.logger.warn('REPORT_SERVICE_KEY не задан');
      throw serviceUnavailable('REPORT_SERVICE_UNAVAILABLE', UNAVAILABLE_MESSAGE);
    }

    let res: Response;
    try {
      res = await fetch(`${url}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Key': key },
        body: JSON.stringify({ facts }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      this.logger.warn(`report-service не ответил: ${err instanceof Error ? err.message : String(err)}`);
      throw serviceUnavailable('REPORT_SERVICE_UNAVAILABLE', UNAVAILABLE_MESSAGE);
    }

    if (!res.ok) {
      this.logger.warn(`report-service ответил ${res.status}`);
      throw serviceUnavailable('REPORT_SERVICE_UNAVAILABLE', UNAVAILABLE_MESSAGE);
    }

    const data: unknown = await res.json().catch(() => null);
    const items = (data as { items?: unknown } | null)?.items;
    if (!Array.isArray(items) || !items.every(isSummaryItem)) {
      this.logger.warn('report-service вернул ответ неверного формата');
      throw serviceUnavailable('REPORT_SERVICE_UNAVAILABLE', UNAVAILABLE_MESSAGE);
    }
    return items;
  }
}
