'use client';

import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import ConfirmAction from '@/components/ui/ConfirmAction';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { categoryOptions, categoryPath } from '@/lib/categories';
import { LIMITS } from '@/lib/limits';
import { buildQuery } from '@/lib/query-string';
import { Category, Page } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

export default function CategoriesManager() {
  const { user, request } = useAuth();

  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const list = useApiQuery<Page<Category>>(
    `/categories${buildQuery({ page, limit: 100, includeArchived: includeArchived || undefined })}`,
  );
  // Для выбора родителя нужны только действующие категории
  const active = useApiQuery<Page<Category>>('/categories?limit=100');

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    const trimmed = name.trim();
    setFormError(null);
    setSuccess(null);
    if (trimmed.length < LIMITS.categoryName.min || trimmed.length > LIMITS.categoryName.max) {
      setFields({ name: `Название от ${LIMITS.categoryName.min} до ${LIMITS.categoryName.max} символов` });
      return;
    }
    setFields({});

    setPending(true);
    try {
      await request<Category>('/categories', {
        method: 'POST',
        body: { name: trimmed, parentId: parentId || null },
      });
      setSuccess(`Категория «${trimmed}» создана`);
      setName('');
      list.reload();
      active.reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(Object.keys(err.fields).length > 0 ? null : err.message);
      } else {
        setFormError('Не удалось создать категорию');
      }
    } finally {
      setPending(false);
    }
  }

  async function archive(category: Category) {
    await request(`/categories/${category.id}/archive`, { method: 'POST' });
    list.reload();
    active.reload();
  }

  const parentOptions = categoryOptions(active.data?.items ?? []).map((o) => ({ value: o.id, label: o.label }));

  return (
    <div className="stack">
      <h1>Категории курсов</h1>

      <section className="card">
        <h2>Новая категория</h2>
        {formError && <Alert kind="error">{formError}</Alert>}
        {success && <Alert kind="success">{success}</Alert>}
        <form className="form" onSubmit={handleCreate} noValidate>
          <TextField
            label="Название"
            name="name"
            value={name}
            onChange={setName}
            error={fields.name}
            hint={`От ${LIMITS.categoryName.min} до ${LIMITS.categoryName.max} символов`}
            maxLength={LIMITS.categoryName.max}
            required
          />
          <SelectField
            label="Родительская категория"
            name="parentId"
            value={parentId}
            onChange={setParentId}
            placeholder="Нет (верхний уровень)"
            options={parentOptions}
            error={fields.parentId}
          />
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Создаем…' : 'Создать категорию'}
          </button>
        </form>
      </section>

      <section className="card stack">
        <div className="page-head">
          <h2>Все категории</h2>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => {
                setIncludeArchived(e.target.checked);
                setPage(1);
              }}
            />
            Показать архивные
          </label>
        </div>
        <p className="muted">
          Категории не удаляются, а архивируются. Архивировать можно только свою категорию, в которой нет курсов и
          действующих подкатегорий.
        </p>
        <QueryView query={list}>
          {(data) => {
            if (data.items.length === 0) return <p className="muted">Категорий пока нет.</p>;
            const byId = new Map(data.items.map((c) => [c.id, c]));
            const rows = [...data.items].sort((a, b) =>
              categoryPath(a, byId).localeCompare(categoryPath(b, byId), 'ru'),
            );
            return (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Категория</th>
                        <th scope="col">Курсов</th>
                        <th scope="col">Подкатегорий</th>
                        <th scope="col">Статус</th>
                        <th scope="col">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c) => (
                        <tr key={c.id}>
                          <td>{categoryPath(c, byId)}</td>
                          <td>{c.coursesCount}</td>
                          <td>{c.childrenCount}</td>
                          <td>{c.archived ? <span className="badge">В архиве</span> : 'Действует'}</td>
                          <td>
                            {!c.archived && c.createdBy === user?.id && (
                              <ConfirmAction
                                buttonLabel="В архив"
                                question={`Отправить категорию «${c.name}» в архив? Ее нельзя будет выбрать для новых курсов.`}
                                confirmLabel="В архив"
                                onConfirm={() => archive(c)}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={data.page} limit={data.limit} total={data.total} onChange={setPage} />
              </>
            );
          }}
        </QueryView>
      </section>
    </div>
  );
}
