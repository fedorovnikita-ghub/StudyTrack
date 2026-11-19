'use client';

import { useId, useState } from 'react';
import { ApiError } from '@/lib/api';
import { LIMITS } from '@/lib/limits';
import Alert from './Alert';

interface ConfirmActionProps {
  buttonLabel: string;
  question: string;
  confirmLabel: string;
  requireReason?: boolean;
  danger?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}

// Действие с последствиями: сначала понятное подтверждение (и причина, если она нужна)
export default function ConfirmAction(props: ConfirmActionProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;
    const text = reason.trim();
    if (props.requireReason && (text.length < LIMITS.reason.min || text.length > LIMITS.reason.max)) {
      setError(`Причина от ${LIMITS.reason.min} до ${LIMITS.reason.max} символов`);
      return;
    }

    setPending(true);
    setError(null);
    try {
      await props.onConfirm(text);
      setOpen(false);
      setReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось выполнить действие');
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={props.danger ? 'btn btn-small btn-danger' : 'btn btn-small'} onClick={() => setOpen(true)}>
        {props.buttonLabel}
      </button>
    );
  }

  return (
    <div className="confirm-box" role="group" aria-labelledby={`${id}-question`}>
      <p id={`${id}-question`} className="confirm-question">
        {props.question}
      </p>
      {props.requireReason && (
        <div className="field">
          <label htmlFor={`${id}-reason`}>
            Причина <span className="required" aria-hidden="true">*</span>
          </label>
          <textarea
            id={`${id}-reason`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={LIMITS.reason.max}
            rows={2}
          />
          <p className="field-hint">
            От {LIMITS.reason.min} до {LIMITS.reason.max} символов
          </p>
        </div>
      )}
      {error && <Alert kind="error">{error}</Alert>}
      <div className="actions">
        <button
          type="button"
          className={props.danger ? 'btn btn-small btn-danger' : 'btn btn-small btn-primary'}
          onClick={handleConfirm}
          disabled={pending}
        >
          {pending ? 'Выполняем…' : props.confirmLabel}
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
