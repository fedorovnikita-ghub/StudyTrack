'use client';

import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import TextAreaField from '@/components/ui/TextAreaField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime } from '@/lib/format';
import { LIMITS } from '@/lib/limits';
import { AssignmentDetails, Submission } from '@/lib/types';

interface SubmitFormProps {
  assignment: AssignmentDetails;
  onSubmitted: () => void;
}

// Форма сдачи: каждая отправка создает новую версию. Номер, время и просрочку назначает сервер
export default function SubmitForm({ assignment, onSubmitted }: SubmitFormProps) {
  const { request } = useAuth();
  const [text, setText] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<Submission | null>(null);
  const [pending, setPending] = useState(false);

  const minLength = assignment.settings.minTextLength;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return; // защита от двойного нажатия

    setFormError(null);
    setResult(null);
    if (text.trim().length < minLength) {
      setFields({ text: `Текст работы не короче ${minLength} символов` });
      return;
    }
    setFields({});

    setPending(true);
    try {
      const created = await request<Submission>(`/assignments/${assignment.id}/submissions`, {
        method: 'POST',
        body: { text },
      });
      // Текст остается в форме: его удобно доработать для следующей версии
      setResult(created);
      onSubmitted();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Не удалось отправить работу. Повторите попытку');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h2>Сдать работу</h2>
      {assignment.isOverdue && (
        <Alert kind="warning">Срок сдачи прошел. Новая версия будет отмечена как просроченная.</Alert>
      )}
      {formError && <Alert kind="error">{formError}</Alert>}
      {result && (
        <Alert kind={result.isLate ? 'warning' : 'success'}>
          Версия №{result.number} отправлена {formatDateTime(result.submittedAt)}
          {result.isLate ? ' — с опозданием' : ''}.
        </Alert>
      )}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextAreaField
          label="Текст работы"
          name="text"
          value={text}
          onChange={setText}
          error={fields.text}
          hint={`Не короче ${minLength} символов`}
          maxLength={LIMITS.submissionText.max}
          rows={10}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Отправляем…' : 'Отправить новую версию'}
        </button>
      </form>
    </section>
  );
}
