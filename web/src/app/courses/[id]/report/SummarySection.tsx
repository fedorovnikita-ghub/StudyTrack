'use client';

import QueryView from '@/components/ui/QueryView';
import { formatPercent } from '@/lib/format';
import { SummaryReport } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

// Средний балл по заданиям считает отдельный report-service.
// Если он остановлен, ошибка показывается только здесь, остальной отчет работает
export default function SummarySection({ courseId, query }: { courseId: string; query: string }) {
  const summary = useApiQuery<SummaryReport>(`/courses/${encodeURIComponent(courseId)}/report/summary${query}`);

  return (
    <section className="card stack">
      <h2>Средний балл по заданиям</h2>
      <p className="muted">Рассчитывает отдельный сервис отчетов по обезличенным оценкам.</p>
      <QueryView query={summary}>
        {(data) =>
          data.items.length === 0 ? (
            <p className="muted">В выбранном периоде нет заданий.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Задание</th>
                    <th scope="col">Оценок</th>
                    <th scope="col">Сумма баллов</th>
                    <th scope="col">Средний балл</th>
                    <th scope="col">Средний %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.assignment.id}>
                      <td>{i.assignment.title}</td>
                      <td>{i.count}</td>
                      <td>{i.total}</td>
                      <td>
                        {i.average === null ? '— (нет оценок)' : `${i.average.toLocaleString('ru-RU')} из ${i.assignment.maxScore}`}
                      </td>
                      <td>{formatPercent(i.averagePercent)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={5}>
                      Всего оценок в расчете: {data.factsCount}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        }
      </QueryView>
    </section>
  );
}
