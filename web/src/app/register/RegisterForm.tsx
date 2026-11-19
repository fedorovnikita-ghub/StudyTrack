'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { LIMITS, utf8Bytes } from '@/lib/limits';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Те же правила, что в RegisterDto на сервере. Сервер все равно проверяет сам
function validate(displayName: string, email: string, password: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  const name = displayName.trim();
  if (name.length < LIMITS.displayName.min || name.length > LIMITS.displayName.max) {
    errors.displayName = `Имя от ${LIMITS.displayName.min} до ${LIMITS.displayName.max} символов`;
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Неверный формат email';
  }
  if (password.length < LIMITS.password.min) {
    errors.password = `Пароль не короче ${LIMITS.password.min} символов`;
  } else if (utf8Bytes(password) > LIMITS.password.maxBytes) {
    errors.password = 'Пароль слишком длинный';
  }
  if (confirm !== password) {
    errors.passwordConfirm = 'Пароли не совпадают';
  }
  return errors;
}

export default function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    const errors = validate(displayName, email, password, passwordConfirm);
    setFields(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      await register(displayName.trim(), email.trim(), password);
      router.push('/me');
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Не удалось зарегистрироваться. Повторите попытку');
      }
      setPending(false);
    }
  }

  return (
    <section className="card narrow">
      <h1>Регистрация</h1>
      <p className="muted">Регистрация создает аккаунт студента. Аккаунты преподавателей выдает администратор проекта.</p>
      {formError && <Alert kind="error">{formError}</Alert>}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Имя"
          name="displayName"
          value={displayName}
          onChange={setDisplayName}
          error={fields.displayName}
          hint={`От ${LIMITS.displayName.min} до ${LIMITS.displayName.max} символов`}
          maxLength={LIMITS.displayName.max}
          autoComplete="name"
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          error={fields.email}
          hint="Например, ivanov@example.com"
          maxLength={LIMITS.email.max}
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
          hint={`Не короче ${LIMITS.password.min} символов`}
          autoComplete="new-password"
          required
        />
        <TextField
          label="Повторите пароль"
          name="passwordConfirm"
          type="password"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          error={fields.passwordConfirm}
          autoComplete="new-password"
          required
        />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Создаем аккаунт…' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="muted form-footer">
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
    </section>
  );
}
