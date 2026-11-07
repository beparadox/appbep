/**
 * The three leaderboard operations, independent of HTTP and of DynamoDB.
 * YOU implement this file (tutorial steps 4-6).
 * Tutorial: docs/tutorials/npuzzle-leaderboard.md
 * Tests:    service.test.ts
 *
 * Each function returns a `Reply` (status + JSON body) and never throws for bad input:
 * bad input gets a 4xx Reply with an ErrorResponse body (see contract.ts).
 */
import type { NpuzzleStore } from './store';

/** Placeholder used by the stubs. Delete it once every function is implemented. */
function todo(step: string, ...args: unknown[]): never {
  throw new Error(`TODO ${step} (called with ${JSON.stringify(args)})`);
}

/** Everything the service needs from the outside world, passed in so tests can fake it. */
export interface Deps {
  store: NpuzzleStore;
  /** Current time in epoch ms (Date.now in production). */
  now: () => number;
  /** A new unique id (crypto.randomUUID in production). */
  newId: () => string;
  /** Like Math.random. */
  random: () => number;
  /** Lowercase words a name may not contain (see names.ts). */
  blocked: readonly string[];
}

export interface Reply {
  status: number;
  body: unknown;
}

/**
 * Step 4. POST /api/scores/npuzzle/challenge
 * Make a random board, remember it with the time, and return 201 ChallengeResponse.
 */
export async function issueChallenge(deps: Deps): Promise<Reply> {
  return todo('step 4: issueChallenge', Object.keys(deps));
}

/**
 * Step 5. POST /api/scores/npuzzle
 * `body` is the raw request body (a string, or undefined if there wasn't one).
 * Validate, take the challenge, replay the actions, save the score, return 201 SubmitResponse.
 * The order of the checks matters; the tutorial says why.
 */
export async function submitScore(deps: Deps, body: string | undefined): Promise<Reply> {
  return todo('step 5: submitScore', Object.keys(deps), body);
}

/**
 * Step 6. GET /api/scores/npuzzle?board=today|alltime&by=moves|time
 * `query` is the query-string parameters (undefined if there were none).
 * Return 200 BoardResponse with the top BOARD_SIZE entries, ranked 1, 2, 3, ...
 */
export async function getBoard(
  deps: Deps,
  query: Record<string, string | undefined> | undefined,
): Promise<Reply> {
  return todo('step 6: getBoard', Object.keys(deps), query);
}
