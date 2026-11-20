'use client';

import { useId } from 'react';

interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'search';
  error?: string;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
}

// Поле формы: подпись, подсказка о формате и ошибка рядом с полем
export default function TextField(props: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [props.hint ? hintId : null, props.error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label htmlFor={id}>
        {props.label}
        {props.required && <span className="required" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        name={props.name}
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        autoComplete={props.autoComplete}
        maxLength={props.maxLength}
        disabled={props.disabled}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {props.hint && (
        <p id={hintId} className="field-hint">
          {props.hint}
        </p>
      )}
      {props.error && (
        <p id={errorId} className="field-error">
          {props.error}
        </p>
      )}
    </div>
  );
}
