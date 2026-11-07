/**
 * Tests for puzzle.ts. For each tutorial step, change that step's `describe.skip` to
 * `describe`, watch the tests fail, then make them pass:
 *   npm test -w api -- --watch puzzle
 */
import { describe, expect, it } from 'vitest';
import { GOAL, type Action } from './contract';
import { applyActions, isBoard, isGoal, isSolvable, randomBoard } from './puzzle';

/** A predictable stand-in for Math.random. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe.skip('step 1a: isBoard', () => {
  it('accepts 1-9 in any order', () => {
    expect(isBoard(GOAL)).toBe(true);
    expect(isBoard([9, 8, 7, 6, 5, 4, 3, 2, 1])).toBe(true);
  });
  it('rejects repeats, gaps, wrong lengths and non-integers', () => {
    expect(isBoard([1, 1, 3, 4, 5, 6, 7, 8, 9])).toBe(false);
    expect(isBoard([0, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(false);
    expect(isBoard([1, 2, 3, 4, 5, 6, 7, 8])).toBe(false);
    expect(isBoard([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(false);
    expect(isBoard([1.5, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(false);
  });
});

describe.skip('step 1b: isGoal', () => {
  it('is true only for 1..9 in order', () => {
    expect(isGoal([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(true);
    expect(isGoal([1, 2, 3, 4, 5, 6, 7, 9, 8])).toBe(false);
  });
});

describe.skip('step 1c: isSolvable', () => {
  it('knows the goal and one-slide-away boards are solvable', () => {
    expect(isSolvable(GOAL)).toBe(true);
    expect(isSolvable([1, 2, 3, 4, 5, 6, 7, 9, 8])).toBe(true);
    expect(isSolvable([1, 2, 3, 4, 5, 9, 7, 8, 6])).toBe(true);
  });
  it('knows swapping two tiles makes it unsolvable', () => {
    expect(isSolvable([2, 1, 3, 4, 5, 6, 7, 8, 9])).toBe(false);
    expect(isSolvable([1, 2, 3, 4, 5, 6, 8, 7, 9])).toBe(false);
  });
  it('ignores the blank when counting inversions', () => {
    // 8 6 7 / 2 5 4 / 3 _ 1 is one of the hardest boards (31 moves) and solvable.
    expect(isSolvable([8, 6, 7, 2, 5, 4, 3, 9, 1])).toBe(true);
  });
});

describe.skip('step 1d: applyActions', () => {
  it('moves the blank in all four directions', () => {
    const start = [1, 2, 3, 4, 9, 5, 6, 7, 8]; // blank in the middle
    expect(applyActions(start, [2])).toEqual([1, 9, 3, 4, 2, 5, 6, 7, 8]); // up
    expect(applyActions(start, [-2])).toEqual([1, 2, 3, 4, 7, 5, 6, 9, 8]); // down
    expect(applyActions(start, [-1])).toEqual([1, 2, 3, 9, 4, 5, 6, 7, 8]); // left
    expect(applyActions(start, [1])).toEqual([1, 2, 3, 4, 5, 9, 6, 7, 8]); // right
  });
  it('plays a sequence in order and solves a board', () => {
    expect(applyActions([1, 2, 3, 4, 5, 6, 9, 7, 8], [1, 1])).toEqual(GOAL);
    expect(applyActions(GOAL, [])).toEqual(GOAL);
  });
  it('returns null when the blank would leave the board', () => {
    expect(applyActions(GOAL, [1])).toBeNull(); // right edge
    expect(applyActions(GOAL, [-2])).toBeNull(); // bottom edge
    expect(applyActions([9, 1, 2, 3, 4, 5, 6, 7, 8], [2])).toBeNull(); // top edge
    expect(applyActions([9, 1, 2, 3, 4, 5, 6, 7, 8], [-1])).toBeNull(); // left edge
  });
  it("doesn't wrap around from one row to the next", () => {
    // Blank at the start of the middle row: "left" must not land at the end of the top row.
    expect(applyActions([1, 2, 3, 9, 4, 5, 6, 7, 8], [-1])).toBeNull();
    // Blank at the end of the top row: "right" must not land at the start of the middle row.
    expect(applyActions([1, 2, 9, 3, 4, 5, 6, 7, 8], [1])).toBeNull();
  });
  it("doesn't change the input", () => {
    const start = [1, 2, 3, 4, 5, 6, 7, 9, 8];
    applyActions(start, [1]);
    expect(start).toEqual([1, 2, 3, 4, 5, 6, 7, 9, 8]);
  });
  it('allows sliding back and forth', () => {
    const there: Action[] = [-1, 1, -1, 1];
    expect(applyActions(GOAL, there)).toEqual(GOAL);
  });
});

describe.skip('step 4a: randomBoard', () => {
  it('always makes a solvable, unsolved board', () => {
    const random = seeded(42);
    for (let i = 0; i < 200; i += 1) {
      const board = randomBoard(random);
      expect(isBoard(board)).toBe(true);
      expect(isSolvable(board)).toBe(true);
      expect(isGoal(board)).toBe(false);
    }
  });
  it('makes different boards', () => {
    const random = seeded(7);
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) seen.add(randomBoard(random).join(''));
    expect(seen.size).toBeGreaterThan(40);
  });
});
