import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every stylesheet under src/. */
function stylesheets(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return stylesheets(p);
    return e.name.endsWith('.css') ? [p] : [];
  });
}

describe('@keyframes names', () => {
  // Keyframe names are global to the page, and once a stylesheet has loaded it stays
  // loaded. Two stylesheets defining the same name means one silently replaces the
  // other's animation (the funhouse's "peek" once made the home page cube fade away).
  it('are never defined twice', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const file of stylesheets(__dirname)) {
      const css = fs.readFileSync(file, 'utf8');
      for (const [, name] of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
        const rel = path.relative(__dirname, file);
        if (seen.has(name)) clashes.push(`${name}: ${seen.get(name)} and ${rel}`);
        else seen.set(name, rel);
      }
    }
    expect(clashes).toEqual([]);
  });
});
