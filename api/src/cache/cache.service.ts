import { Injectable, Logger } from '@nestjs/common';

interface Entry {
  value: unknown;
  expiresAt: number;
}

export const CACHE_DEFAULT_TTL_MS = 60_000; // 60 секунд
export const CACHE_MAX_ENTRIES = 100;

// Небольшой кеш в памяти одного процесса API: срок жизни и не больше 100 ключей.
// Если самый старый ключ мешает новому - он удаляется (порядок Map = порядок добавления/обращения).
// Любая ошибка кеша не ломает запрос: данные просто читаются из базы
@Injectable()
export class CacheService {
  private readonly logger = new Logger('Cache');
  private readonly entries = new Map<string, Entry>();
  // Поколение ключа растет при каждой очистке. Чтение, начатое ДО изменения данных,
  // не положит в кеш устаревший результат, если очистка случилась во время чтения
  private readonly generations = new Map<string, number>();
  private hits = 0;
  private misses = 0;

  get<T>(key: string): T | undefined {
    try {
      const entry = this.entries.get(key);
      if (!entry) {
        this.misses += 1;
        return undefined;
      }
      if (entry.expiresAt <= Date.now()) {
        this.entries.delete(key);
        this.misses += 1;
        return undefined;
      }
      // Обращение делает ключ "свежим": переносим его в конец очереди на вытеснение
      this.entries.delete(key);
      this.entries.set(key, entry);
      this.hits += 1;
      // Копия: изменение ответа не испортит значение в кеше
      return structuredClone(entry.value) as T;
    } catch (err) {
      this.logger.warn(`Ошибка чтения кеша: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }

  set(key: string, value: unknown, ttlMs = CACHE_DEFAULT_TTL_MS): void {
    try {
      this.entries.delete(key);
      while (this.entries.size >= CACHE_MAX_ENTRIES) {
        const oldest = this.entries.keys().next().value;
        if (oldest === undefined) break;
        this.entries.delete(oldest);
      }
      this.entries.set(key, { value: structuredClone(value), expiresAt: Date.now() + ttlMs });
    } catch (err) {
      this.logger.warn(`Ошибка записи в кеш: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
  }

  clear(): void {
    this.entries.clear();
    this.generations.clear();
  }

  // Значение из кеша или из loader. Ошибка loader (например, 404) не кешируется
  async getOrLoad<T>(key: string, loader: () => Promise<T>, ttlMs = CACHE_DEFAULT_TTL_MS): Promise<{ value: T; hit: boolean }> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return { value: cached, hit: true };
    const generation = this.generations.get(key) ?? 0;
    const value = await loader();
    if ((this.generations.get(key) ?? 0) === generation) {
      this.set(key, value, ttlMs);
    }
    return { value, hit: false };
  }

  stats() {
    return { size: this.entries.size, maxEntries: CACHE_MAX_ENTRIES, hits: this.hits, misses: this.misses };
  }
}
