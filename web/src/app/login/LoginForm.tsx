'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const { user, login, notice } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return; // защита от двойной отправки

    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Укажите email';
    if (!password) errors.password = 'Укажите пароль';
    setFields(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      await login(email, password);
      router.push(nextPath);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Не удалось войти. Повторите попытку');
      }
      setPending(false);
    }
  }

  if (user) {
    return (
      <section className="card stack narrow">
        <h1>Вы уже вошли</h1>
        <p>
          <Link className="btn btn-primary" href={nextPath}>
            Продолжить
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="card narrow">
      <h1>Вход</h1>
      {notice && <Alert kind="warning">{notice}</Alert>}
      {formError && <Alert kind="error">{formError}</Alert>}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          error={fields.email}
          autoComplete="email"
          required
        />
        <TextField
          label="Пароль"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          error={fields.password}
          autoComplete="current-password"
          required
        />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Входим…' : 'Войти'}
        </button>
      </form>
      <p className="muted form-footer">
        Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
      </p>
    </section>
  );
}
