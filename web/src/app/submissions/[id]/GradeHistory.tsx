import { formatDateTime } from '@/lib/format';
import { GradeEntry } from '@/lib/types';

// История оценок версии: новые сверху. Текущая оценка - первая строка
export default function GradeHistory({ grades, maxScore }: { grades: GradeEntry[]; maxScore: number }) {
  return (
    <section className="card">
      <h2>История оценок</h2>
      {grades.length === 0 ? (
        <p className="muted">Эту версию еще не оценивали.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Когда</th>
                <th scope="col">Балл</th>
                <th scope="col">Преподаватель</th>
                <th scope="col">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, index) => (
                <tr key={g.id}>
                  <td>
                    {formatDateTime(g.gradedAt)} {index === 0 && <span className="badge badge-success">текущая</span>}
                  </td>
                  <td>
                    {g.score} из {maxScore}
                  </td>
                  <td>{g.gradedBy.displayName}</td>
                  <td className="pre-wrap">{g.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
