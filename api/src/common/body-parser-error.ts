import type { NextFunction, Request, Response } from 'express';

// Ошибки разбора JSON возникают до контроллеров Nest, поэтому ловим их отдельно
export function bodyParserErrorHandler(
  err: { type?: string; status?: number } | undefined,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!err) {
    next();
    return;
  }

  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Слишком большой запрос' } });
    return;
  }

  if (err.type === 'entity.parse.failed' || err.status === 400) {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Тело запроса не является корректным JSON' } });
    return;
  }

  next(err);
}
