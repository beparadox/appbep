/**
 * Leaderboard names. YOU implement this file (tutorial step 2).
 * Tutorial: docs/tutorials/npuzzle-leaderboard.md
 * Tests:    names.test.ts
 */

/** Placeholder used by the stubs. Delete it once every function is implemented. */
function todo(step: string, ...args: unknown[]): never {
  throw new Error(`TODO ${step} (called with ${JSON.stringify(args)})`);
}

/**
 * Step 2. May this name go on the public board?
 *   - 3-12 characters, only letters, digits and underscores
 *   - and it doesn't contain a blocked word, even disguised:
 *     ignore case and underscores, and read common look-alike digits as letters
 *     (0 -> o, 1 -> i, 3 -> e, 4 -> a, 5 -> s, 7 -> t)
 * `blocked` is a list of lowercase words. It's a parameter so the tests can use their own.
 *   isAllowedName('bam_2013', ['badword'])   -> true
 *   isAllowedName('B4D_W0RD_x', ['badword']) -> false
 */
export function isAllowedName(name: string, blocked: readonly string[]): boolean {
  return todo('step 2: isAllowedName', name, blocked);
}
