/**
 * The 8-puzzle rules, as pure functions. YOU implement this file (tutorial steps 1 and 4).
 * Tutorial: docs/tutorials/npuzzle-leaderboard.md
 * Tests:    puzzle.test.ts (unskip each step's tests as you go)
 *
 * Every function below is a stub that throws. Replace the body; keep the signature.
 */
import type { Action, State } from './contract';

/** Placeholder used by the stubs. Delete it once every function is implemented. */
function todo(step: string, ...args: unknown[]): never {
  throw new Error(`TODO ${step} (called with ${JSON.stringify(args)})`);
}

/**
 * Step 1a. Is this a real 3x3 board: exactly the numbers 1-9, each once?
 *   isBoard([1, 2, 3, 4, 5, 6, 7, 8, 9]) -> true
 *   isBoard([1, 1, 3, 4, 5, 6, 7, 8, 9]) -> false
 */
export function isBoard(state: readonly number[]): boolean {
  return todo('step 1a: isBoard', state);
}

/** Step 1b. Is this board the goal [1..9]? */
export function isGoal(state: State): boolean {
  return todo('step 1b: isGoal', state);
}

/**
 * Step 1c. Can this board be solved by sliding? (Exactly half of all boards can't.)
 * Count the "inversions": pairs of tiles, ignoring the blank (9), where a bigger number comes
 * before a smaller one in reading order. On a 3-wide board, solvable <=> inversions are even.
 */
export function isSolvable(state: State): boolean {
  return todo('step 1c: isSolvable', state);
}

/**
 * Step 1d. Play the actions, in order, on a COPY of `state` (don't change the input).
 * Each action moves the blank: 2 = up, -2 = down, -1 = left, 1 = right.
 * Returns the final board, or null if any move would push the blank off the board.
 *   applyActions([1, 2, 3, 4, 5, 6, 7, 9, 8], [1]) -> [1, 2, 3, 4, 5, 6, 7, 8, 9]
 *   applyActions(GOAL, [1])                        -> null (blank is already on the right edge)
 */
export function applyActions(state: State, actions: readonly Action[]): State | null {
  return todo('step 1d: applyActions', state, actions);
}

/**
 * Step 4a. A fresh puzzle for a challenge: a random board that is solvable and is not
 * already solved. `random` works like Math.random (a number in [0, 1)); it's passed in so
 * the tests can control it.
 */
export function randomBoard(random: () => number): State {
  return todo('step 4a: randomBoard', random);
}
