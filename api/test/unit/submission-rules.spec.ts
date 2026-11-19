import {
  canSubmitVersion,
  isLateSubmission,
  nextVersionNumber,
  submissionTextLength,
} from '../../src/submissions/submission-rules';

describe('Правила сдачи работ (unit)', () => {
  it('первая версия получает номер 1, следующие - на 1 больше последней', () => {
    expect(nextVersionNumber(null)).toBe(1);
    expect(nextVersionNumber(undefined)).toBe(1);
    expect(nextVersionNumber(1)).toBe(2);
    expect(nextVersionNumber(7)).toBe(8);
  });

  it('сдача ровно в момент срока - вовремя, на миллисекунду позже - просрочка', () => {
    const due = new Date('2026-12-01T18:59:00.000Z');
    expect(isLateSubmission(new Date('2026-12-01T18:58:59.999Z'), due)).toBe(false);
    expect(isLateSubmission(new Date('2026-12-01T18:59:00.000Z'), due)).toBe(false);
    expect(isLateSubmission(new Date('2026-12-01T18:59:00.001Z'), due)).toBe(true);
  });

  it('предел версий включительный', () => {
    expect(canSubmitVersion(1, 1)).toBe(true);
    expect(canSubmitVersion(2, 1)).toBe(false);
    expect(canSubmitVersion(20, 20)).toBe(true);
    expect(canSubmitVersion(21, 20)).toBe(false);
  });

  it('длина текста считается без пробелов по краям', () => {
    expect(submissionTextLength('   ')).toBe(0);
    expect(submissionTextLength('  ответ  ')).toBe(5);
  });
});
