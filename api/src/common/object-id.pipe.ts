import { Injectable, PipeTransform } from '@nestjs/common';
import { AppError } from './app-error';

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

// Проверка :id в адресе. Неверный формат - 400, а не 500 от MongoDB
@Injectable()
export class ObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
      throw new AppError(400, 'INVALID_ID', 'Неверный формат идентификатора');
    }
    return value.toLowerCase();
  }
}
