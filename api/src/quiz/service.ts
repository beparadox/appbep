/**
 * Quiz votes, independent of HTTP and DynamoDB (those come in through QuizDeps; see aws.ts).
 */
import { CHOICES, type QuizError, type Tally } from './contract';

export interface QuizStore {
  counts(quiz: string, id: string): Promise<number[]>;
  /**
   * Records one vote, atomically: the visitor marker and the counter change together or not
   * at all. Returns false if this visitor already voted on this question.
   */
  vote(quiz: string, id: string, voter: string, choice: number): Promise<boolean>;
}

export interface QuizDeps {
  store: QuizStore;
  isQuestion: (quiz: string, id: string) => boolean;
  /** A keyed hash identifying this visitor for this question; null if not configured. */
  voterKey: (ip: string, quiz: string, id: string) => Promise<string | null>;
}

export interface Reply {
  status: number;
  body: unknown;
}

const fail = (status: number, error: QuizError, extra: object = {}): Reply => ({
  status,
  body: { error, ...extra },
});

function tally(quiz: string, id: string, counts: number[]): Tally {
  const full = Array.from({ length: CHOICES }, (_, i) => counts[i] ?? 0);
  return { quiz, id, counts: full, total: full.reduce((a, b) => a + b, 0) };
}

export async function getTally(deps: QuizDeps, quiz: string, id: string): Promise<Reply> {
  if (!deps.isQuestion(quiz, id)) return fail(404, 'unknown_question');
  return { status: 200, body: tally(quiz, id, await deps.store.counts(quiz, id)) };
}

export async function castVote(
  deps: QuizDeps,
  quiz: string,
  id: string,
  body: string | undefined,
  ip: string,
): Promise<Reply> {
  if (!deps.isQuestion(quiz, id)) return fail(404, 'unknown_question');
  let choice: unknown;
  try {
    choice = (JSON.parse(body ?? '') as { choice?: unknown } | null)?.choice;
  } catch {
    return fail(400, 'invalid_request');
  }
  if (typeof choice !== 'number' || !Number.isInteger(choice) || choice < 0 || choice >= CHOICES) {
    return fail(400, 'invalid_request');
  }
  const voter = await deps.voterKey(ip, quiz, id);
  if (!voter) return fail(503, 'not_configured');

  const counted = await deps.store.vote(quiz, id, voter, choice);
  const current = tally(quiz, id, await deps.store.counts(quiz, id));
  if (!counted) return fail(409, 'already_voted', { tally: current });
  return { status: 201, body: current };
}
