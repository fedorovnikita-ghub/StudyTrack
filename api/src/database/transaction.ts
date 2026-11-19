import { ClientSession, Connection } from 'mongoose';

// Выполняет work в транзакции MongoDB.
// Драйвер сам повторяет транзакцию при временных конфликтах записи (ограниченно по времени),
// поэтому work должен только читать и писать в базу, без побочных эффектов снаружи.
// Ошибки бизнес-правил (AppError) прерывают транзакцию без повтора.
export async function withTransaction<T>(
  connection: Connection,
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await connection.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
