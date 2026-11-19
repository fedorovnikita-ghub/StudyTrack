'use client';

import { useId } from 'react';

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; // пустой вариант в начале списка
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function SelectField(props: SelectFieldProps) {
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
      <select
        id={id}
        name={props.name}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        disabled={props.disabled}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy || undefined}
      >
        {props.placeholder !== undefined && <option value="">{props.placeholder}</option>}
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
