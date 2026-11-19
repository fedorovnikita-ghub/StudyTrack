import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { AppError, ErrorBody, FieldErrors } from './app-error';
import { isDuplicateKeyError } from './mongo-errors';

// Безопасные сообщения для стандартных HTTP-ошибок Nest
const STANDARD_ERRORS: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'Неверный формат запроса' },
  401: { code: 'UNAUTHORIZED', message: 'Требуется вход в систему' },
  403: { code: 'FORBIDDEN', message: 'Недостаточно прав для этого действия' },
  404: { code: 'NOT_FOUND', message: 'Объект или адрес не найден' },
  405: { code: 'METHOD_NOT_ALLOWED', message: 'Метод не поддерживается' },
  409: { code: 'CONFLICT', message: 'Конфликт данных. Обновите страницу и повторите' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'Слишком большой запрос' },
  429: { code: 'TOO_MANY_REQUESTS', message: 'Слишком много запросов. Повторите позже' },
  503: { code: 'SERVICE_UNAVAILABLE', message: 'Сервис временно недоступен. Повторите позже' },
};

// Ошибки драйвера, которые означают, что база сейчас недоступна
const DB_UNAVAILABLE_ERRORS = [
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
];

interface HttpErrorResult {
  status: number;
  body: ErrorBody;
}

function makeBody(code: string, message: string, fields?: FieldErrors): ErrorBody {
  return fields ? { error: { code, message, fields } } : { error: { code, message } };
}

function isDbUnavailable(exception: unknown): boolean {
  if (!(exception instanceof Error)) return false;
  if (DB_UNAVAILABLE_ERRORS.includes(exception.name)) return true;
  // Mongoose ждёт подключения и через время отдаёт "buffering timed out"
  return exception.message.includes('buffering timed out');
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, body } = this.toHttpError(exception, req);

    // Если ответ уже начал отправляться (например, CSV-поток), второй JSON отправить нельзя
    if (res.headersSent) {
      res.destroy();
      return;
    }

    res.status(status).json(body);
  }

  private toHttpError(exception: unknown, req: Request): HttpErrorResult {
    if (exception instanceof AppError) {
      return { status: exception.getStatus(), body: exception.getResponse() as ErrorBody };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const known = STANDARD_ERRORS[status];
      if (known) {
        return { status, body: makeBody(known.code, known.message) };
      }
      if (status < 500) {
        return { status, body: makeBody('REQUEST_ERROR', 'Запрос не может быть выполнен') };
      }
    }

    if (exception instanceof MongooseError.ValidationError) {
      const fields: FieldErrors = {};
      for (const [path, err] of Object.entries(exception.errors)) {
        fields[path] = err.message;
      }
      return { status: 400, body: makeBody('VALIDATION_ERROR', 'Проверьте правильность заполнения полей', fields) };
    }

    if (exception instanceof MongooseError.CastError) {
      return { status: 400, body: makeBody('INVALID_ID', 'Неверный формат идентификатора') };
    }

    if (isDuplicateKeyError(exception)) {
      return { status: 409, body: makeBody('DUPLICATE', 'Такая запись уже существует') };
    }

    if (isDbUnavailable(exception)) {
      this.logger.warn(`База данных недоступна: ${req.method} ${req.originalUrl}`);
      return { status: 503, body: makeBody('DB_UNAVAILABLE', 'База данных временно недоступна. Повторите позже') };
    }

    // Неожиданная ошибка: стек пишем только в лог сервера, клиенту - безопасное сообщение
    const stack = exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(`${req.method} ${req.originalUrl}`, stack);
    return { status: 500, body: makeBody('INTERNAL_ERROR', 'Внутренняя ошибка сервера. Повторите позже') };
  }
}
