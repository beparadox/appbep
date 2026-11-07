/**
 * Tests for the ELIZA engine, one block per tutorial step.
 * They start SKIPPED so CI stays green. When you start a step, change its
 * `describe.skip` to `describe`, watch the tests fail, then make them pass:
 *
 *   npm test -w web -- --watch eliza
 */
import { describe, expect, it } from 'vitest';
import { Eliza, fillReply, matchPattern, normalize, reflect } from './engine';
import type { Voice } from './types';

/** A tiny voice just for tests. Your real voices go in ../voices/. */
const TEST_VOICE: Voice = {
  id: 'test',
  name: 'Test',
  screenName: 'TESTBOT',
  greeting: 'Hello.',
  goodbye: 'Bye.',
  quitWords: ['bye', 'quit'],
  reflections: { i: 'you', me: 'you', my: 'your', am: 'are', you: 'I', your: 'my' },
  substitutions: { dont: "don't", cant: "can't" },
  keywords: [
    {
      word: 'feel',
      rank: 1,
      rules: [
        { pattern: '* i feel *', replies: ['Why do you feel (2)?', 'Do you often feel (2)?'] },
      ],
    },
    {
      word: 'mother',
      rank: 5,
      rules: [{ pattern: '* my mother *', replies: ['Tell me more about your family.'] }],
    },
    {
      word: 'computer',
      rank: 10,
      rules: [{ pattern: '*', replies: ['Do computers worry you?'] }],
    },
  ],
  fallbacks: ['Please go on.', 'I see.'],
};

describe.skip('step 1: normalize', () => {
  it('lowercases, strips punctuation, collapses spaces', () => {
    expect(normalize('  Hello,   World!!  ')).toBe('hello world');
  });
  it('keeps apostrophes so contractions survive', () => {
    expect(normalize("I don't know.")).toBe("i don't know");
  });
  it('applies whole-word substitutions', () => {
    expect(normalize('I dont know', TEST_VOICE.substitutions)).toBe("i don't know");
    expect(normalize('dontcha know', TEST_VOICE.substitutions)).toBe('dontcha know');
  });
});

describe.skip('step 2: matchPattern', () => {
  it('captures what each * matched', () => {
    expect(matchPattern('* i feel *', 'well i feel sad today')).toEqual(['well', 'sad today']);
  });
  it('lets * match nothing', () => {
    expect(matchPattern('* i feel *', 'i feel')).toEqual(['', '']);
  });
  it('returns null when the words are not there', () => {
    expect(matchPattern('* i feel *', 'you feel sad')).toBeNull();
  });
  it('matches whole words only', () => {
    expect(matchPattern('* am *', 'i ham it up')).toBeNull();
  });
  it('a lone * matches anything', () => {
    expect(matchPattern('*', 'anything at all')).toEqual(['anything at all']);
  });
});

describe.skip('step 3: reflect', () => {
  it('swaps first and second person', () => {
    expect(reflect('my mother hates me', TEST_VOICE.reflections)).toBe('your mother hates you');
  });
  it('swaps each word only once', () => {
    expect(reflect('i love you', TEST_VOICE.reflections)).toBe('you love I');
  });
});

describe.skip('step 4: fillReply', () => {
  it('inserts reflected captures', () => {
    expect(
      fillReply('Why do you feel (2)?', ['well', 'sad about my job'], TEST_VOICE.reflections),
    ).toBe('Why do you feel sad about your job?');
  });
  it('leaves templates without placeholders alone', () => {
    expect(fillReply('Please go on.', ['x'], TEST_VOICE.reflections)).toBe('Please go on.');
  });
});

describe.skip('step 5: Eliza', () => {
  it('greets', () => {
    expect(new Eliza(TEST_VOICE).greet()).toBe('Hello.');
  });
  it('responds using the matching rule', () => {
    expect(new Eliza(TEST_VOICE).respond('I feel tired.')).toBe('Why do you feel tired?');
  });
  it('cycles through replies instead of repeating', () => {
    const bot = new Eliza(TEST_VOICE);
    expect(bot.respond('i feel tired')).toBe('Why do you feel tired?');
    expect(bot.respond('i feel hungry')).toBe('Do you often feel hungry?');
    expect(bot.respond('i feel ok')).toBe('Why do you feel ok?');
  });
  it('prefers the highest-ranked keyword', () => {
    expect(
      new Eliza(TEST_VOICE).respond('I feel like my mother hates computers and my computer'),
    ).toBe('Do computers worry you?');
  });
  it('falls back (cycling) when nothing matches', () => {
    const bot = new Eliza(TEST_VOICE);
    expect(bot.respond('the weather is nice')).toBe('Please go on.');
    expect(bot.respond('really nice')).toBe('I see.');
  });
  it('says goodbye on a quit word', () => {
    const bot = new Eliza(TEST_VOICE);
    expect(bot.isQuit('Bye!')).toBe(true);
    expect(bot.respond('bye')).toBe('Bye.');
  });
});
