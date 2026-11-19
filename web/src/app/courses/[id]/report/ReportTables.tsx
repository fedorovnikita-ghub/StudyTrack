import { formatDateTime, formatPercent } from '@/lib/format';
import { CourseReport } from '@/lib/types';

// Таблицы отчета с итоговыми строками. Единицы: студенты (сдачи) и баллы
export default function ReportTables({ report }: { report: CourseReport }) {
  const t = report.totals;

  return (
    <>
      <section className="card stack">
        <h2>Сдаваемость и просрочки</h2>
        {report.assignments.length === 0 ? (
          <p className="muted">В выбранном периоде нет заданий.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Задание</th>
                  <th scope="col">Срок</th>
                  <th scope="col">Студентов</th>
                  <th scope="col">Сдали</th>
                  <th scope="col">Вовремя</th>
                  <th scope="col">Только с опозданием</th>
                  <th scope="col">Не сдали</th>
                  <th scope="col">Пропустили срок</th>
                  <th scope="col">Сдаваемость</th>
                </tr>
              </thead>
              <tbody>
                {report.assignments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>
                      {formatDateTime(a.dueAt)}{' '}
                      {a.isOverdue && <span className="badge badge-warning">прошел</span>}
                    </td>
                    <td>{a.enrolled}</td>
                    <td>{a.submitted}</td>
                    <td>{a.onTime}</td>
                    <td>{a.lateOnly}</td>
                    <td>{a.notSubmitted}</td>
                    <td>{a.missed}</td>
                    <td>{formatPercent(a.submissionRate)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Итого: {t.assignments} зад.</th>
                  <td />
                  <td>{t.expected} ожид.</td>
                  <td>{t.submitted}</td>
                  <td>{t.onTime}</td>
                  <td>{t.lateOnly}</td>
                  <td>{t.notSubmitted}</td>
                  <td>{t.missed}</td>
                  <td>
                    <strong>{formatPercent(t.submissionRate)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="card stack">
        <div className="page-head">
          <h2>Текущие результаты студентов</h2>
          <span className="badge">Средний результат курса: {formatPercent(t.averagePercent)}</span>
        </div>
        <p className="muted">
          Текущий балл по заданию — оценка последней оцененной версии. Процент — от суммы максимальных баллов заданий
          периода.
        </p>
        {report.students.length === 0 ? (
          <p className="muted">На курсе нет действующих студентов.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Студент</th>
                  <th scope="col">Баллы</th>
                  <th scope="col">Результат</th>
                  <th scope="col">Оценено заданий</th>
                  <th scope="col">Только с опозданием</th>
                  <th scope="col">Пропущено сроков</th>
                </tr>
              </thead>
              <tbody>
                {report.students.map((s) => (
                  <tr key={s.studentId}>
                    <td>{s.displayName}</td>
                    <td>
                      {s.totalScore} из {s.maxTotal}
                    </td>
                    <td>{formatPercent(s.percent)}</td>
                    <td>
                      {s.gradedCount} из {t.assignments}
                    </td>
                    <td>{s.lateOnlyCount}</td>
                    <td>{s.missedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
