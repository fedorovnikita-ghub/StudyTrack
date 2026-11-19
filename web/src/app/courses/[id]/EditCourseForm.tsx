'use client';

import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import TextAreaField from '@/components/ui/TextAreaField';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { LIMITS } from '@/lib/limits';
import { CourseDetails } from '@/lib/types';

interface EditCourseFormProps {
  course: CourseDetails;
  onSaved: () => void;
  onReload: () => void;
}

// Редактирование с защитой от конфликтов: на сервер уходит version, которую видел пользователь.
// При 409 введенный текст сохраняется, а пользователь может подгрузить актуальную версию
export default function EditCourseForm({ course, onSaved, onReload }: EditCourseFormProps) {
  const { request } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  function startEditing() {
    setTitle(course.title);
    setDescription(course.description);
    setFields({});
    setFormError(null);
    setConflict(false);
    setSuccess(false);
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    const errors: FieldErrors = {};
    const t = title.trim();
    if (t.length < LIMITS.title.min || t.length > LIMITS.title.max) {
      errors.title = `Название от ${LIMITS.title.min} до ${LIMITS.title.max} символов`;
    }
    setFields(errors);
    setFormError(null);
    setConflict(false);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      await request(`/courses/${course.id}`, {
        method: 'PATCH',
        body: { title: t, description: description.trim(), version: course.version },
      });
      setOpen(false);
      setSuccess(true);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(err.message);
        setConflict(err.status === 409);
      } else {
        setFormError('Не удалось сохранить. Повторите попытку');
      }
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <section className="card">
        {success && <Alert kind="success">Изменения сохранены</Alert>}
        <button type="button" className="btn" onClick={startEditing}>
          Редактировать курс
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Редактирование курса</h2>
      {formError && (
        <Alert kind="error">
          <p className="alert-text">{formError}</p>
          {conflict && (
            <>
              <p className="alert-text">
                Ваш текст в форме сохранен. Загрузите актуальные данные, проверьте изменения и сохраните снова.
              </p>
              <button type="button" className="btn btn-small" onClick={onReload}>
                Загрузить актуальные данные
              </button>
            </>
          )}
        </Alert>
      )}
      {conflict && (
        <p className="muted">
          Сейчас на сервере: «{course.title}», версия {course.version}
        </p>
      )}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Название"
          name="title"
          value={title}
          onChange={setTitle}
          error={fields.title}
          maxLength={LIMITS.title.max}
          required
        />
        <TextAreaField
          label="Описание"
          name="description"
          value={description}
          onChange={setDescription}
          error={fields.description}
          maxLength={LIMITS.description.max}
        />
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Сохранить'}
          </button>
          <button type="button" className="btn" onClick={() => setOpen(false)} disabled={pending}>
            Отмена
          </button>
        </div>
      </form>
    </section>
  );
}
