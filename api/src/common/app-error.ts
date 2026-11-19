import { HttpException } from '@nestjs/common';

export type FieldErrors = Record<string, string>;

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    fields?: FieldErrors;
  };
}

// Ошибка с единым форматом ответа: { error: { code, message, fields? } }
export class AppError extends HttpException {
  constructor(status: number, code: string, message: string, fields?: FieldErrors) {
    const body: ErrorBody = { error: { code, message } };
    if (fields && Object.keys(fields).length > 0) {
      body.error.fields = fields;
    }
    super(body, status);
  }
}

export function validationError(message: string, fields?: FieldErrors) {
  return new AppError(400, 'VALIDATION_ERROR', message, fields);
}

export function unauthorized(message = 'Требуется вход в систему') {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Недостаточно прав для этого действия') {
  return new AppError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Объект не найден') {
  return new AppError(404, 'NOT_FOUND', message);
}

export function conflict(code: string, message: string) {
  return new AppError(409, code, message);
}

export function serviceUnavailable(code: string, message: string) {
  return new AppError(503, code, message);
}
