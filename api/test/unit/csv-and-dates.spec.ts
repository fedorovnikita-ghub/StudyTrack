import { resolvePeriod } from '../../src/common/dates';
import { csvCell, csvLine } from '../../src/reports/csv';

describe('CSV (unit)', () => {
  it('нейтрализует значения, которые Excel принял бы за формулу', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('+7 777')).toBe("'+7 777");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('экранирует разделитель, кавычки и переводы строк', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvLine(['x', 5, true, null])).toBe('x;5;да;\r\n');
  });
});

describe('Период отчета (unit)', () => {
  const now = new Date('2026-11-19T10:00:00Z');

  it('90 дней - можно, 91 - нельзя, конец раньше начала - нельзя', () => {
    expect(resolvePeriod('2026-01-01', '2026-03-31', now).to).toBe('2026-03-31'); // 90 дней
    expect(() => resolvePeriod('2026-01-01', '2026-04-01', now)).toThrow();
    expect(() => resolvePeriod('2026-02-10', '2026-02-01', now)).toThrow();
    expect(() => resolvePeriod('2026-02-31', '2026-03-01', now)).toThrow();
  });

  it('границы дня считаются по Алматы (UTC+5) и переводятся в UTC', () => {
    const p = resolvePeriod('2026-11-01', '2026-11-30', now);
    expect(p.start.toISOString()).toBe('2026-10-31T19:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-11-30T19:00:00.000Z'); // начало 1 декабря, не включается
  });
});
