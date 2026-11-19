'use client';

import { useId } from 'react';

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

// Многострочное поле со счетчиком символов
export default function TextAreaField(props: TextAreaFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hintId, props.error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label htmlFor={id}>
        {props.label}
        {props.required && <span className="required" aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={id}
        name={props.name}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        maxLength={props.maxLength}
        rows={props.rows ?? 5}
        required={props.required}
        disabled={props.disabled}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy}
      />
      <p id={hintId} className="field-hint">
        {props.hint ? `${props.hint}. ` : ''}
        {props.maxLength ? `${props.value.length} из ${props.maxLength} символов` : ''}
      </p>
      {props.error && (
        <p id={errorId} className="field-error">
          {props.error}
        </p>
      )}
    </div>
  );
}
