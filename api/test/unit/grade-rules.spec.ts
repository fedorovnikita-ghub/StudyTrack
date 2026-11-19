import { currentResult, isValidScore, percentOf } from '../../src/grades/grade-rules';

describe('Правила оценивания (unit)', () => {
  it('балл - целое число от 0 до максимума включительно', () => {
    expect(isValidScore(0, 100)).toBe(true);
    expect(isValidScore(100, 100)).toBe(true);
    expect(isValidScore(101, 100)).toBe(false);
    expect(isValidScore(-1, 100)).toBe(false);
    expect(isValidScore(50.5, 100)).toBe(false);
    expect(isValidScore(Number.NaN, 100)).toBe(false);
  });

  it('текущий результат - оценка последней ОЦЕНЕННОЙ версии', () => {
    // v1 = 50, v2 = 80, v3 еще не оценена -> результат 80 по версии 2
    expect(
      currentResult([
        { number: 1, score: 50 },
        { number: 2, score: 80 },
        { number: 3, score: null },
      ]),
    ).toEqual({ number: 2, score: 80 });
  });

  it('порядок версий во входных данных не важен, а оценка 0 - это результат, а не его отсутствие', () => {
    expect(
      currentResult([
        { number: 3, score: 0 },
        { number: 1, score: 90 },
      ]),
    ).toEqual({ number: 3, score: 0 });
  });

  it('без оцененных версий результата нет', () => {
    expect(currentResult([])).toBeNull();
    expect(currentResult([{ number: 1, score: null }])).toBeNull();
  });

  it('процент: один знак после запятой, при нулевом максимуме - нет результата', () => {
    expect(percentOf(2, 3)).toBe(66.7);
    expect(percentOf(0, 50)).toBe(0);
    expect(percentOf(0, 0)).toBeNull();
  });
});
