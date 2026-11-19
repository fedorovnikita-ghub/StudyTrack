import { registerDecorator, ValidationOptions } from 'class-validator';

// Строка не длиннее max байт в UTF-8 (кириллица занимает 2 байта на символ)
export function MaxUtf8Bytes(max: number, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'maxUtf8Bytes',
      target: object.constructor,
      propertyName,
      constraints: [max],
      options,
      validator: {
        validate: (value: unknown) => typeof value !== 'string' || Buffer.byteLength(value, 'utf8') <= max,
      },
    });
  };
}

// Приводит строку к единому виду: убирает пробелы по краям
export function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

// Email: без пробелов по краям и в нижнем регистре
export function normalizeEmail({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}
