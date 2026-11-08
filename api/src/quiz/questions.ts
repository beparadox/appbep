/**
 * Which question ids exist, per quiz. The vote API only needs the ids; the page reads the
 * full JSON files itself. Add a quiz here when its JSON file exists.
 */
import schportz from '../../../content/quizzes/schportz.json';

const QUESTION_IDS: Record<string, ReadonlySet<string>> = {
  schportz: new Set(schportz.questions.map((q) => q.id)),
};

export function isQuestion(quiz: string, id: string): boolean {
  return QUESTION_IDS[quiz]?.has(id) ?? false;
}
