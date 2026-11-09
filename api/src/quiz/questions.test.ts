import { describe, expect, it } from 'vitest';
import apf from '../../../content/quizzes/apf.json';
import schportz from '../../../content/quizzes/schportz.json';
import { isQuestion } from './questions';

describe('quiz files', () => {
  for (const file of [schportz, apf]) {
    it(`${file.quiz}: every question is well formed`, () => {
      const ids = new Set<string>();
      for (const q of file.questions) {
        expect(q.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(ids.has(q.id), `duplicate id ${q.id}`).toBe(false);
        ids.add(q.id);
        expect(q.choices).toHaveLength(5);
        expect(q.responses).toHaveLength(5);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(5);
        expect(isQuestion(file.quiz, q.id)).toBe(true);
      }
    });
  }

  it('knows nothing about other quizzes or ids', () => {
    expect(isQuestion('apf', '1999-01-01')).toBe(false);
    expect(isQuestion('nope', schportz.questions[0]?.id ?? '')).toBe(false);
  });
});
