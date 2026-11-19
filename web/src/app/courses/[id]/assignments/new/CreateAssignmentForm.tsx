'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import TextAreaField from '@/components/ui/TextAreaField';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { almatyInputToIso, TIME_ZONE_LABEL } from '@/lib/format';
import { LIMITS } from '@/lib/limits';
import { Assignment } from '@/lib/types';

interface FormValues {
  title: string;
  text: string;
  dueAt: string;
  maxScore: string;
  maxVersions: string;
  minTextLength: string;
}

function parseIntStrict(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

// Те же правила, что в CreateAssignmentDto на сервере
function validate(v: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  const title = v.title.trim();
  if (title.length < LIMITS.title.min || title.length > LIMITS.title.max) {
    errors.title = `Название от ${LIMITS.title.min} до ${LIMITS.title.max} символов`;
  }
  const text = v.text.trim();
  if (text.length < LIMITS.assignmentText.min || text.length > LIMITS.assignmentText.max) {
    errors.text = `Текст задания от ${LIMITS.assignmentText.min} до ${LIMITS.assignmentText.max} символов`;
  }
  const dueIso = almatyInputToIso(v.dueAt);
  if (!dueIso) errors.dueAt = 'Укажите дату и время';
  else if (new Date(dueIso).getTime() <= Date.now()) errors.dueAt = 'Срок должен быть в будущем';

  const maxScore = parseIntStrict(v.maxScore);
  if (maxScore === null || maxScore < LIMITS.maxScore.min || maxScore > LIMITS.maxScore.max) {
    errors.maxScore = `Целое число от ${LIMITS.maxScore.min} до ${LIMITS.maxScore.max}`;
  }
  const maxVersions = parseIntStrict(v.maxVersions);
  if (maxVersions === null || maxVersions < LIMITS.maxVersions.min || maxVersions > LIMITS.maxVersions.max) {
    errors['settings.maxVersions'] = `Целое число от ${LIMITS.maxVersions.min} до ${LIMITS.maxVersions.max}`;
  }
  const minTextLength = parseIntStrict(v.minTextLength);
  if (
    minTextLength === null ||
    minTextLength < LIMITS.minTextLength.min ||
    minTextLength > LIMITS.minTextLength.max
  ) {
    errors['settings.minTextLength'] = `Целое число от ${LIMITS.minTextLength.min} до ${LIMITS.minTextLength.max}`;
  }
  return errors;
}

export default function CreateAssignmentForm({ courseId }: { courseId: string }) {
  const { request } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState<FormValues>({
    title: '',
    text: '',
    dueAt: '',
    maxScore: '100',
    maxVersions: String(LIMITS.maxVersions.default),
    minTextLength: String(LIMITS.minTextLength.default),
  });
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof FormValues) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    const errors = validate(values);
    setFields(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      const created = await request<Assignment>(`/courses/${courseId}/assignments`, {
        method: 'POST',
        body: {
          title: values.title.trim(),
          text: values.text.trim(),
          dueAt: almatyInputToIso(values.dueAt),
          maxScore: Number(values.maxScore),
          settings: {
            maxVersions: Number(values.maxVersions),
            minTextLength: Number(values.minTextLength),
          },
        },
      });
      router.push(`/assignments/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Не удалось создать задание. Повторите попытку');
      }
      setPending(false);
    }
  }

  return (
    <section className="card">
      <p>
        <Link href={`/courses/${courseId}`}>← К курсу</Link>
      </p>
      <h1>Новое задание</h1>
      {formError && <Alert kind="error">{formError}</Alert>}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Название"
          name="title"
          value={values.title}
          onChange={set('title')}
          error={fields.title}
          maxLength={LIMITS.title.max}
          hint={`От ${LIMITS.title.min} до ${LIMITS.title.max} символов`}
          required
        />
        <TextAreaField
          label="Текст задания"
          name="text"
          value={values.text}
          onChange={set('text')}
          error={fields.text}
          maxLength={LIMITS.assignmentText.max}
          rows={8}
          required
        />
        <TextField
          label={`Срок сдачи (${TIME_ZONE_LABEL})`}
          name="dueAt"
          type="datetime-local"
          value={values.dueAt}
          onChange={set('dueAt')}
          error={fields.dueAt}
          hint="Сдача ровно в момент срока считается вовремя"
          required
        />
        <TextField
          label="Максимальный балл"
          name="maxScore"
          type="number"
          value={values.maxScore}
          onChange={set('maxScore')}
          error={fields.maxScore}
          hint={`Целое число от ${LIMITS.maxScore.min} до ${LIMITS.maxScore.max}`}
          required
        />
        <fieldset className="fieldset">
          <legend>Дополнительные параметры</legend>
          <TextField
            label="Сколько версий может отправить студент"
            name="maxVersions"
            type="number"
            value={values.maxVersions}
            onChange={set('maxVersions')}
            error={fields['settings.maxVersions']}
            hint={`От ${LIMITS.maxVersions.min} до ${LIMITS.maxVersions.max}`}
          />
          <TextField
            label="Минимальная длина текста работы (символов)"
            name="minTextLength"
            type="number"
            value={values.minTextLength}
            onChange={set('minTextLength')}
            error={fields['settings.minTextLength']}
            hint={`От ${LIMITS.minTextLength.min} до ${LIMITS.minTextLength.max}`}
          />
        </fieldset>
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Создаем…' : 'Создать задание'}
          </button>
          <Link className="btn" href={`/courses/${courseId}`}>
            Отмена
          </Link>
        </div>
      </form>
    </section>
  );
}
