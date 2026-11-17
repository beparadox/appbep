import { describe, expect, it } from 'vitest';
import {
  AIM_TIME,
  CHUTE_X,
  CLAW_MAX_X,
  H,
  PARK_X,
  TOKENS,
  W,
  newGame,
  step,
  type Controls,
  type Game,
  type GameEvent,
} from './engine';

const IDLE: Controls = { left: false, right: false, drop: false };
const DT = 1 / 60;

/** Run the game for `seconds` (or until `until` is true), collecting its events. */
function run(g: Game, seconds: number, input = IDLE, until?: (g: Game) => boolean): GameEvent[] {
  const seen: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    step(g, input, DT);
    seen.push(...g.events);
    g.events = [];
    if (until?.(g)) break;
  }
  return seen;
}

/** The plush nearest the top of the pile, which is the easiest to reach. */
const topmost = (g: Game) => g.prizes.reduce((a, b) => (b.y - b.kind.r < a.y - a.kind.r ? b : a));

describe('the plush pile', () => {
  it('settles inside the glass, out of the chute', () => {
    const g = newGame(1);
    run(g, 2);
    expect(g.prizes).toHaveLength(14);
    for (const p of g.prizes) {
      expect(p.x).toBeGreaterThan(CHUTE_X);
      expect(p.x + p.kind.r).toBeLessThanOrEqual(W + 0.01);
      expect(p.y + p.kind.r).toBeLessThanOrEqual(H + 0.01);
      expect(Math.hypot(p.vx, p.vy)).toBeLessThan(40);
    }
    expect(g.won).toHaveLength(0);
  });
});

describe('aiming', () => {
  it('moves the claw along the rail, no further than the glass', () => {
    const g = newGame(2);
    run(g, 1, { ...IDLE, right: true });
    expect(g.clawX).toBeGreaterThan(PARK_X + 100);
    run(g, 5, { ...IDLE, right: true });
    expect(g.clawX).toBe(CLAW_MAX_X);
    run(g, 10, { ...IDLE, left: true });
    expect(g.clawX).toBe(PARK_X);
  });

  it('drops by itself when the timer runs out, and that costs a token', () => {
    const g = newGame(3);
    run(g, AIM_TIME - 0.5);
    expect(g.phase).toBe('aim');
    const events = run(g, 1);
    expect(events).toContainEqual({ type: 'drop' });
    expect(g.tokens).toBe(TOKENS - 1);
  });
});

describe('grabbing', () => {
  it('grabs a plush when the claw is right above it', () => {
    const g = newGame(4);
    g.clawX = topmost(g).x;
    const events = run(g, 6, { ...IDLE, drop: true }, (g) => g.phase === 'lift');
    expect(events.find((e) => e.type === 'grab')).toBeDefined();
    expect(g.held).not.toBeNull();
  });

  it('comes up empty over bare floor', () => {
    const g = newGame(5);
    g.prizes = [];
    g.clawX = 200;
    const events = run(g, 6, { ...IDLE, drop: true }, (g) => g.phase === 'lift');
    expect(events).toContainEqual({ type: 'miss', nudged: false });
  });

  it('wins whatever it carries to the chute without slipping', () => {
    const g = newGame(6);
    g.clawX = topmost(g).x;
    run(g, 6, { ...IDLE, drop: true }, (g) => g.phase === 'lift');
    g.grip = 1; // a perfect grip never slips
    const events = run(g, 15, IDLE, (g) => g.phase === 'aim');
    expect(events.find((e) => e.type === 'win')).toBeDefined();
    expect(g.won).toHaveLength(1);
  });

  it('wins roughly as often as the skill deserves', () => {
    let wins = 0;
    for (let seed = 0; seed < 60; seed++) {
      const g = newGame(seed);
      g.clawX = topmost(g).x;
      run(g, 30, IDLE, (g) => g.phase === 'aim' && g.tokens < TOKENS);
      wins += g.won.length;
    }
    // Dead-centre grabs should mostly work, but not always.
    expect(wins).toBeGreaterThan(25);
    expect(wins).toBeLessThan(60);
  });
});

describe('a whole game', () => {
  it(`ends after ${TOKENS} goes`, () => {
    const g = newGame(7);
    const events = run(g, 200, IDLE, (g) => g.phase === 'over');
    expect(g.phase).toBe('over');
    expect(g.tokens).toBe(0);
    expect(events.filter((e) => e.type === 'drop')).toHaveLength(TOKENS);
  });
});
