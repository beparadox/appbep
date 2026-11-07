/**
 * The ELIZA engine. YOU implement this file, one function per tutorial step.
 * Tutorial: docs/tutorials/eliza-chatroom.md
 * Tests:    engine.test.ts (unskip each step's tests as you go)
 *
 * Every function below is a stub that throws. Replace the body; keep the signature.
 */
import type { Voice } from './types';

/** Placeholder used by the stubs. Delete it once every function is implemented. */
function todo(step: string, ...args: unknown[]): never {
  throw new Error(`TODO ${step} (called with ${JSON.stringify(args)})`);
}

/**
 * Step 1. Clean up raw user input so patterns can match it.
 * Lowercase, turn punctuation into spaces (but keep apostrophes), collapse runs of
 * whitespace, trim, then apply the voice's word `substitutions` (whole words only).
 */
export function normalize(input: string, substitutions: Record<string, string> = {}): string {
  return todo('step 1: normalize', input, substitutions);
}

/**
 * Step 2. Match a decomposition pattern against normalized input.
 * Returns the captured fragments (one per `*`, trimmed) or null if it doesn't match.
 *   matchPattern('* i feel *', 'well i feel sad today') -> ['well', 'sad today']
 *   matchPattern('* i feel *', 'i feel')                -> ['', '']
 *   matchPattern('* i feel *', 'you feel sad')          -> null
 * Words must match whole words: '* am *' must NOT match 'i ham it up'.
 */
export function matchPattern(pattern: string, input: string): string[] | null {
  return todo('step 2: matchPattern', pattern, input);
}

/**
 * Step 3. Swap first and second person in a captured fragment, word by word.
 *   reflect('my mother hates me', { my: 'your', me: 'you' }) -> 'your mother hates you'
 * Each word is swapped at most once (so i -> you never turns back into i).
 */
export function reflect(fragment: string, reflections: Record<string, string>): string {
  return todo('step 3: reflect', fragment, reflections);
}

/**
 * Step 4. Fill a reply template with reflected captures.
 *   fillReply('Why do you feel (2)?', ['well', 'sad about my job'], { my: 'your' })
 *     -> 'Why do you feel sad about your job?'
 */
export function fillReply(
  template: string,
  captures: string[],
  reflections: Record<string, string>,
): string {
  return todo('step 4: fillReply', template, captures, reflections);
}

/**
 * Step 5. The conversation loop. Holds a voice plus the state needed to cycle replies.
 */
export class Eliza {
  private readonly voice: Voice;

  constructor(voice: Voice) {
    this.voice = voice;
  }

  /** What the bot says when it enters the room. */
  greet(): string {
    return this.voice.greeting;
  }

  /** True if this input should end the conversation (one of voice.quitWords). */
  isQuit(input: string): boolean {
    return todo('step 5: isQuit', input, this.voice.quitWords);
  }

  /**
   * Turn one user message into one bot reply:
   * 1. normalize the input   2. quit word? -> goodbye
   * 3. find keywords present, highest rank first
   * 4. for each keyword, try its rules in order; first pattern that matches wins
   * 5. use that rule's NEXT reply (cycle), filled with the captures
   * 6. nothing matched -> next fallback (cycle)
   */
  respond(input: string): string {
    return todo('step 5: respond', input);
  }
}
