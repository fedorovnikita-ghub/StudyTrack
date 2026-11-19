import ApiStatus from '@/components/ApiStatus';
import HomeActions from '@/components/HomeActions';

export default function HomePage() {
  return (
    <div className="stack">
      <section className="card stack">
        <h1>StudyTrack</h1>
        <p className="muted">
          Учет учебных заданий и результатов: преподаватель создает курсы и задания, студенты сдают работы, преподаватель
          ставит оценки.
        </p>
        <HomeActions />
      </section>
      <ApiStatus />
    </div>
  );
}
