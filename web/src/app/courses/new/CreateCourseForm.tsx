'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import QueryView from '@/components/ui/QueryView';
import SelectField from '@/components/ui/SelectField';
import TextAreaField from '@/components/ui/TextAreaField';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { categoryOptions } from '@/lib/categories';
import { LIMITS } from '@/lib/limits';
import { Category, Course, Page } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

function validate(title: string, description: string, categoryId: string): FieldErrors {
  const errors: FieldErrors = {};
  const t = title.trim();
  if (t.length < LIMITS.title.min || t.length > LIMITS.title.max) {
    errors.title = `Название от ${LIMITS.title.min} до ${LIMITS.title.max} символов`;
  }
  if (description.trim().length > LIMITS.description.max) {
    errors.description = `Описание не длиннее ${LIMITS.description.max} символов`;
  }
  if (!categoryId) errors.categoryId = 'Выберите категорию';
  return errors;
}

export default function CreateCourseForm() {
  const { request } = useAuth();
  const router = useRouter();
  const categories = useApiQuery<Page<Category>>('/categories?limit=100');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    const errors = validate(title, description, categoryId);
    setFields(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      const course = await request<Course>('/courses', {
        method: 'POST',
        body: { title: title.trim(), description: description.trim(), categoryId },
      });
      router.push(`/courses/${course.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Не удалось создать курс. Повторите попытку');
      }
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h1>Новый курс</h1>
      <QueryView query={categories}>
        {(data) =>
          data.items.length === 0 ? (
            <Alert kind="info">
              Сначала создайте хотя бы одну категорию на странице <Link href="/categories">«Категории»</Link>.
            </Alert>
          ) : (
            <>
              {formError && <Alert kind="error">{formError}</Alert>}
              <form className="form" onSubmit={handleSubmit} noValidate>
                <TextField
                  label="Название"
                  name="title"
                  value={title}
                  onChange={setTitle}
                  error={fields.title}
                  hint={`От ${LIMITS.title.min} до ${LIMITS.title.max} символов`}
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
                <SelectField
                  label="Категория"
                  name="categoryId"
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Выберите категорию"
                  options={categoryOptions(data.items).map((o) => ({ value: o.id, label: o.label }))}
                  error={fields.categoryId}
                  required
                />
                <div className="actions">
                  <button type="submit" className="btn btn-primary" disabled={pending}>
                    {pending ? 'Создаем…' : 'Создать курс'}
                  </button>
                  <Link className="btn" href="/courses">
                    Отмена
                  </Link>
                </div>
              </form>
            </>
          )
        }
      </QueryView>
    </section>
  );
}
