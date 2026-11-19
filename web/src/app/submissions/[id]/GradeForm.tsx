'use client';

import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import TextAreaField from '@/components/ui/TextAreaField';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { LIMITS } from '@/lib/limits';
import { SubmissionDetails } from '@/lib/types';

interface GradeFormProps {
  submission: SubmissionDetails;
  onGraded: () => void;
  onReload: () => void;
}

// Оценка конкретной версии. На сервер уходит version: если работу уже оценили
// в другом окне, придет 409, а введенные балл и комментарий останутся в форме
export default function GradeForm({ submission, onGraded, onReload }: GradeFormProps) {
  const { request } = useAuth();
  const maxScore = submission.assignment.maxScore;

  const [score, setScore] = useState(submission.currentGrade ? String(submission.currentGrade.score) : '');
  const [comment, setComment] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    setFormError(null);
    setSuccess(null);
    setConflict(false);

    const value = score.trim();
    if (!/^\d+$/.test(value) || Number(value) > maxScore) {
      setFields({ score: `Целое число от 0 до ${maxScore}` });
      return;
    }
    if (comment.trim().length > LIMITS.gradeComment.max) {
      setFields({ comment: `Комментарий не длиннее ${LIMITS.gradeComment.max} символов` });
      return;
    }
    setFields({});

    setPending(true);
    try {
      await request(`/submissions/${submission.id}/grade`, {
        method: 'POST',
        body: { score: Number(value), comment: comment.trim(), version: submission.version },
      });
      setSuccess(`Оценка ${value} из ${maxScore} сохранена`);
      setComment('');
      onGraded();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(err.message);
        setConflict(err.status === 409);
      } else {
        setFormError('Не удалось сохранить оценку. Повторите попытку');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h2>{submission.currentGrade ? 'Изменить оценку' : 'Оценить работу'}</h2>
      <p className="muted">
        Оценка ставится именно этой версии (№{submission.number}). Прежние оценки сохраняются в истории.
      </p>
      {formError && (
        <Alert kind="error">
          <p className="alert-text">{formError}</p>
          {conflict && (
            <>
              <p className="alert-text">Ваши балл и комментарий в форме сохранены.</p>
              <button type="button" className="btn btn-small" onClick={onReload}>
                Загрузить актуальные данные
              </button>
            </>
          )}
        </Alert>
      )}
      {success && <Alert kind="success">{success}</Alert>}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label={`Балл (из ${maxScore})`}
          name="score"
          type="number"
          value={score}
          onChange={setScore}
          error={fields.score}
          hint={`Целое число от 0 до ${maxScore}`}
          required
        />
        <TextAreaField
          label="Комментарий для студента"
          name="comment"
          value={comment}
          onChange={setComment}
          error={fields.comment}
          maxLength={LIMITS.gradeComment.max}
          rows={3}
        />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить оценку'}
        </button>
      </form>
    </section>
  );
}
