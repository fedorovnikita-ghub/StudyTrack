import { CACHE_MAX_ENTRIES, CacheService } from '../../src/cache/cache.service';

describe('Кеш в памяти (unit)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('значение живет 60 секунд, потом читается заново', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-19T10:00:00Z'));
    const cache = new CacheService();
    const loader = jest.fn().mockResolvedValue({ title: 'Курс' });

    expect((await cache.getOrLoad('course:1', loader)).hit).toBe(false);
    jest.setSystemTime(new Date('2026-11-19T10:00:59Z'));
    expect((await cache.getOrLoad('course:1', loader)).hit).toBe(true);
    jest.setSystemTime(new Date('2026-11-19T10:01:00Z'));
    expect((await cache.getOrLoad('course:1', loader)).hit).toBe(false);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it(`не больше ${CACHE_MAX_ENTRIES} ключей: вытесняется самый давний`, () => {
    const cache = new CacheService();
    for (let i = 0; i <= CACHE_MAX_ENTRIES; i += 1) cache.set(`k${i}`, i);
    expect(cache.stats().size).toBe(CACHE_MAX_ENTRIES);
    expect(cache.get('k0')).toBeUndefined();
    expect(cache.get(`k${CACHE_MAX_ENTRIES}`)).toBe(CACHE_MAX_ENTRIES);
  });

  it('ошибка загрузки не кешируется, изменение ответа не портит кеш', async () => {
    const cache = new CacheService();
    await expect(cache.getOrLoad('x', () => Promise.reject(new Error('404')))).rejects.toThrow('404');
    expect(cache.stats().size).toBe(0);

    cache.set('course:2', { title: 'Исходное' });
    const copy = cache.get<{ title: string }>('course:2');
    if (copy) copy.title = 'Испорчено';
    expect(cache.get<{ title: string }>('course:2')?.title).toBe('Исходное');
  });
});

describe('Кеш: гонка чтения и изменения (unit)', () => {
  it('чтение, начатое до очистки ключа, не кладет в кеш устаревшие данные', async () => {
    const cache = new CacheService();
    let finishLoad: (v: { title: string }) => void = () => undefined;
    const slowLoad = cache.getOrLoad('course:3', () => new Promise<{ title: string }>((r) => (finishLoad = r)));

    cache.delete('course:3'); // курс изменили, пока шло чтение
    finishLoad({ title: 'Старое' });
    await slowLoad;

    expect(cache.get('course:3')).toBeUndefined();
  });
});
