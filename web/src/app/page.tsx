import ApiStatus from '@/components/ApiStatus';

export default function HomePage() {
  return (
    <div className="stack">
      <section className="card">
        <h1>StudyTrack</h1>
        <p className="muted">
          Учет учебных заданий и результатов: преподаватель создает курсы и задания, студенты сдают работы, преподаватель
          ставит оценки.
        </p>
      </section>
      <ApiStatus />
    </div>
  );
}
