/**
 * The N-Puzzle leaderboard API: what the browser sends and what it gets back.
 *
 * This file is GIVEN (tutorial step 0, docs/tutorials/npuzzle-leaderboard.md). The game page
 * (web/public/exhibits/npuzzizzle/js/app/leaderboard.js) already speaks exactly this, so if you
 * change it, change both sides.
 *
 * How a score is earned (and why it can't simply be made up):
 *   1. The player presses Play. The page asks the server for a puzzle:
 *        POST /api/scores/npuzzle/challenge          -> 201 ChallengeResponse
 *      The server generates the puzzle and remembers it, with the time it was issued.
 *   2. The player solves it. The page sends the moves it made:
 *        POST /api/scores/npuzzle   (SubmitRequest)  -> 201 SubmitResponse
 *      The server replays those moves on ITS copy of the puzzle. The move count comes from
 *      the replay, and the time is measured by the server (submit time minus issue time),
 *      so neither can be faked. Each challenge can be used once.
 *   3. Anyone can read the boards:
 *        GET /api/scores/npuzzle?board=today|alltime&by=moves|time  -> 200 BoardResponse
 */

/**
 * A puzzle state: the tiles read left to right, top to bottom. 1-8 are tiles and 9 is the
 * blank. The goal is [1, 2, 3, 4, 5, 6, 7, 8, 9].
 */
export type State = number[];

/**
 * One move, described as the direction the BLANK moves (this is how the 2013 game encodes it):
 *    2 = up, -2 = down, -1 = left, 1 = right.
 */
export type Action = 2 | -2 | -1 | 1;

export const DIMENSION = 3;
export const GOAL: State = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** 201 from POST /api/scores/npuzzle/challenge (the request has no body). */
export interface ChallengeResponse {
  id: string;
  state: State;
}

/** Body of POST /api/scores/npuzzle. */
export interface SubmitRequest {
  challengeId: string;
  /** 3-12 characters: letters, digits and underscores. */
  name: string;
  actions: Action[];
}

/** 201 from POST /api/scores/npuzzle. */
export interface SubmitResponse {
  moves: number;
  timeMs: number;
}

export type Board = 'today' | 'alltime';
export type RankBy = 'moves' | 'time';

export interface BoardEntry {
  rank: number;
  name: string;
  moves: number;
  timeMs: number;
  /** When the score was submitted, as an ISO 8601 timestamp. */
  at: string;
}

/** 200 from GET /api/scores/npuzzle?board=...&by=... (top 10). */
export interface BoardResponse {
  board: Board;
  by: RankBy;
  /** The day "today" refers to: a UTC date, yyyy-mm-dd. */
  day: string;
  entries: BoardEntry[];
}

/**
 * Error responses all look like { error: ErrorCode }.
 *   400 invalid_request   body isn't JSON, or fields are missing or the wrong type
 *   400 invalid_name      name fails the length/charset rule or the bad-word filter
 *   400 invalid_actions   too many actions (over MAX_ACTIONS) or a value that isn't an Action
 *   400 not_solved        the moves are legal but don't end at GOAL
 *   404 unknown_challenge no such challenge: never issued, already used, or expired
 */
export type ErrorCode =
  'invalid_request' | 'invalid_name' | 'invalid_actions' | 'not_solved' | 'unknown_challenge';

export interface ErrorResponse {
  error: ErrorCode;
}

/** A challenge expires this long after it's issued. */
export const CHALLENGE_TTL_SECONDS = 60 * 60;
/** Upper bound on moves accepted in one submission (keeps the replay cheap). */
export const MAX_ACTIONS = 2000;
/** How many entries a board returns. */
export const BOARD_SIZE = 10;
