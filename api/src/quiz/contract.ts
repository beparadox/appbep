/**
 * Quiz of the Day voting API (Schportz now, Angry Packers Fan later).
 * The questions themselves are static files in the repo (content/quizzes/<quiz>.json); only
 * vote counts are stored, in DynamoDB.
 *
 *   GET  /api/quiz/{quiz}/{id}/tally                       -> 200 Tally
 *   POST /api/quiz/{quiz}/{id}/vote   { choice: 0..4 }     -> 201 Tally
 *
 * `id` is the question's id in the JSON file (its original date, yyyy-mm-dd).
 * One vote per visitor per question: a second vote gets 409 { error: 'already_voted', tally }.
 */

export interface Tally {
  quiz: string;
  id: string;
  /** Votes for each of the five choices, cast on this site. */
  counts: number[];
  total: number;
}

export type QuizError =
  | 'invalid_request' // 400 body isn't { choice: 0..4 }
  | 'unknown_question' // 404 no such quiz or question id
  | 'already_voted' // 409 (the body also carries `tally`)
  | 'not_configured'; // 503 the hashing key isn't set up in AWS yet

export const CHOICES = 5;

/** How long a visitor's "already voted" marker is kept. */
export const VOTER_TTL_SECONDS = 30 * 24 * 60 * 60;
