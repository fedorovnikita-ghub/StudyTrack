import { ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { AppError, FieldErrors } from './app-error';

// Превращаем ошибки class-validator в плоский объект { "поле": "сообщение" }
function collectFields(errors: ValidationError[], parent = '', result: FieldErrors = {}): FieldErrors {
  for (const err of errors) {
    const path = parent ? `${parent}.${err.property}` : err.property;

    if (err.constraints && !result[path]) {
      if (err.constraints.whitelistValidation) {
        result[path] = 'Неизвестное поле';
      } else {
        result[path] = Object.values(err.constraints)[0];
      }
    }

    if (err.children && err.children.length > 0) {
      collectFields(err.children, path, result);
    }
  }
  return result;
}

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true, // лишние поля в body и query отклоняются с 400
    transform: true,
    exceptionFactory: (errors) =>
      new AppError(400, 'VALIDATION_ERROR', 'Проверьте правильность заполнения полей', collectFields(errors)),
  });
}
