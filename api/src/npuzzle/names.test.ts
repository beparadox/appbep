/**
 * Tests for names.ts. Unskip, watch them fail, make them pass:
 *   npm test -w api -- --watch names
 * The blocked words here are harmless stand-ins; the real list is yours (tutorial step 2).
 */
import { describe, expect, it } from 'vitest';
import { isAllowedName } from './names';

const BLOCKED = ['badword', 'meanie'];

describe.skip('step 2: isAllowedName', () => {
  it('accepts 3-12 letters, digits and underscores', () => {
    expect(isAllowedName('bam', BLOCKED)).toBe(true);
    expect(isAllowedName('bam_2013', BLOCKED)).toBe(true);
    expect(isAllowedName('ABCDEFGHIJKL', BLOCKED)).toBe(true);
  });
  it('rejects the wrong length or other characters', () => {
    expect(isAllowedName('ab', BLOCKED)).toBe(false);
    expect(isAllowedName('ABCDEFGHIJKLM', BLOCKED)).toBe(false);
    expect(isAllowedName('no!', BLOCKED)).toBe(false);
    expect(isAllowedName('two words', BLOCKED)).toBe(false);
    expect(isAllowedName('<b>bam</b>', BLOCKED)).toBe(false);
    expect(isAllowedName('naïve', BLOCKED)).toBe(false);
    expect(isAllowedName('', BLOCKED)).toBe(false);
  });
  it('rejects blocked words anywhere in the name, in any case', () => {
    expect(isAllowedName('badword', BLOCKED)).toBe(false);
    expect(isAllowedName('xBadWordx', BLOCKED)).toBe(false);
    expect(isAllowedName('MEANIE99', BLOCKED)).toBe(false);
  });
  it('sees through underscores and look-alike digits', () => {
    expect(isAllowedName('bad_word', BLOCKED)).toBe(false);
    expect(isAllowedName('B4D_W0RD', BLOCKED)).toBe(false);
    expect(isAllowedName('m3an13', BLOCKED)).toBe(false);
  });
  it('allows everything else, including with an empty list', () => {
    expect(isAllowedName('badwolf', BLOCKED)).toBe(true);
    expect(isAllowedName('badword', [])).toBe(true);
  });
});
