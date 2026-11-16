/**
 * SKILL TESTER: the claw machine in the arcade. This file is the whole game with no
 * drawing in it: the claw's moves, the plush pile's physics, and when a grab holds.
 * SkillTester.tsx draws it and feeds it the controls.
 *
 * Seen from the front. The claw rides a rail along the top. The prize chute is the box
 * in the bottom-left corner: whatever drops over its wall is yours.
 *
 * Units: the glass is W × H, y grows downward, time is in seconds.
 */

export const W = 360;
export const H = 440;
/** The claw's hub, parked on the rail. */
export const RAIL_Y = 34;
/** The chute's wall: x, and how far down it starts. */
export const CHUTE_X = 76;
export const CHUTE_TOP = 318;
/** Where the claw parks above the chute, and how far right it can go. */
export const PARK_X = CHUTE_X / 2;
export const CLAW_MAX_X = W - 26;
/** From the hub down to the fingertips, and the half-width of the open fingers. */
export const ARM = 30;
export const REACH = 26;

export const TOKENS = 5;
export const AIM_TIME = 15;
const MOVE_SPEED = 130;
const DROP_SPEED = 160;
const LIFT_SPEED = 95;
const CLOSE_TIME = 0.45;
const OPEN_TIME = 0.4;
const GRAVITY = 900;
/**
 * How fast a weak grip gives way, per second of carrying. A dead-centre grab on a
 * small plush loses it about one time in ten; a grab half a plush off-centre, about
 * half the time.
 */
const SLIP_RATE = 0.42;

export type Face = 'happy' | 'oneEye' | 'sleepy' | 'smug' | 'angry' | 'worried';

export interface PrizeKind {
  id: string;
  /** Said when you win it. */
  name: string;
  fill: string;
  r: number;
  /** 0 = grippy, higher = slides out of the claw more easily. */
  slip: number;
  face: Face;
}

export const KINDS: Record<string, PrizeKind> = {
  lime: {
    id: 'lime',
    name: 'a lime-green bear with one eye',
    fill: '#8fe04a',
    r: 17,
    slip: 0.05,
    face: 'oneEye',
  },
  pink: { id: 'pink', name: 'a pink something', fill: '#ff7ac8', r: 16, slip: 0.05, face: 'happy' },
  cyan: {
    id: 'cyan',
    name: 'a cyan cat, slightly damp',
    fill: '#3af2ff',
    r: 18,
    slip: 0.1,
    face: 'sleepy',
  },
  duck: {
    id: 'duck',
    name: 'a yellow duck that has seen things',
    fill: '#ffe14d',
    r: 15,
    slip: 0,
    face: 'worried',
  },
  purple: {
    id: 'purple',
    name: 'THE PURPLE ONE',
    fill: '#8a5aff',
    r: 24,
    slip: 0.22,
    face: 'smug',
  },
  apf: {
    id: 'apf',
    name: 'an Angry Packers Fan plush. He is furious about it.',
    fill: '#2f7a3a',
    r: 20,
    slip: 0.15,
    face: 'angry',
  },
};

/** What's in the machine: plenty of small ones, one purple one, one APF. */
const STOCK = [
  'lime',
  'lime',
  'lime',
  'pink',
  'pink',
  'pink',
  'cyan',
  'cyan',
  'cyan',
  'duck',
  'duck',
  'duck',
  'purple',
  'apf',
];

export interface Prize {
  n: number;
  kind: PrizeKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Turned a little, for looks; drifts as it rolls. */
  spin: number;
}

export type Phase = 'aim' | 'drop' | 'close' | 'lift' | 'carry' | 'open' | 'over';

/** Things that happened during a step, for sounds and messages. */
export type GameEvent =
  | { type: 'drop' }
  | { type: 'grab'; prize: Prize; grip: number }
  | { type: 'miss'; nudged: boolean }
  | { type: 'slip'; prize: Prize }
  | { type: 'win'; prize: Prize }
  | { type: 'over' };

export interface Game {
  phase: Phase;
  /** Seconds spent in this phase. */
  t: number;
  clawX: number;
  clawY: number;
  /** 1 = fingers wide open, 0 = closed. */
  open: number;
  tokens: number;
  aimLeft: number;
  prizes: Prize[];
  held: Prize | null;
  /** How firmly the claw holds `held`, 0–1. */
  grip: number;
  won: Prize[];
  events: GameEvent[];
  rand: () => number;
}

export interface Controls {
  left: boolean;
  right: boolean;
  drop: boolean;
}

/** A small seeded random number generator (mulberry32), so tests can replay a game. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newGame(seed = Date.now()): Game {
  const rand = seeded(seed);
  const order = [...STOCK].sort(() => rand() - 0.5);
  const prizes: Prize[] = order.map((id, n) => {
    const kind = KINDS[id];
    return {
      n,
      kind,
      x: CHUTE_X + kind.r + 4 + rand() * (W - CHUTE_X - 2 * kind.r - 8),
      y: H - 60 - n * 26,
      vx: 0,
      vy: 0,
      spin: (rand() - 0.5) * 0.6,
    };
  });
  const g: Game = {
    phase: 'aim',
    t: 0,
    clawX: PARK_X,
    clawY: RAIL_Y,
    open: 1,
    tokens: TOKENS,
    aimLeft: AIM_TIME,
    prizes,
    held: null,
    grip: 0,
    won: [],
    events: [],
    rand,
  };
  // Let the pile fall into place before anyone sees it, and sweep anything that
  // happened to land in the chute back onto the pile.
  for (let i = 0; i < 240; i++) {
    physics(g, 1 / 60);
    for (const p of g.prizes) if (p.x < CHUTE_X) p.x = CHUTE_X + p.kind.r + 2;
  }
  return g;
}

const fingertips = (g: Game) => g.clawY + ARM;

/** Advance the game by dt seconds. Events land in g.events; the caller empties it. */
export function step(g: Game, input: Controls, dt: number): void {
  g.t += dt;
  switch (g.phase) {
    case 'aim': {
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      g.clawX = clamp(g.clawX + dir * MOVE_SPEED * dt, PARK_X, CLAW_MAX_X);
      g.aimLeft = Math.max(0, g.aimLeft - dt);
      if (input.drop || g.aimLeft === 0) {
        g.tokens -= 1;
        go(g, 'drop');
        g.events.push({ type: 'drop' });
      }
      break;
    }
    case 'drop': {
      g.clawY += DROP_SPEED * dt;
      // Stop when the palm lands on a plush, or the fingertips hit the floor.
      const palm = g.clawY + 8;
      const landed = g.prizes.some(
        (p) => Math.abs(p.x - g.clawX) < p.kind.r * 0.8 && palm >= p.y - p.kind.r,
      );
      if (landed || fingertips(g) >= H - 2) go(g, 'close');
      break;
    }
    case 'close': {
      g.open = Math.max(0, 1 - g.t / CLOSE_TIME);
      if (g.open === 0) {
        grab(g);
        go(g, 'lift');
      }
      break;
    }
    case 'lift': {
      g.clawY = Math.max(RAIL_Y, g.clawY - LIFT_SPEED * dt);
      maybeSlip(g, dt);
      if (g.clawY === RAIL_Y) go(g, 'carry');
      break;
    }
    case 'carry': {
      g.clawX = Math.max(PARK_X, g.clawX - MOVE_SPEED * dt);
      maybeSlip(g, dt);
      if (g.clawX === PARK_X) go(g, 'open');
      break;
    }
    case 'open': {
      if (g.held) release(g);
      g.open = Math.min(1, g.t / OPEN_TIME);
      // Wait for the prize to land (or not) before the next go.
      if (g.t > 1.1) {
        if (g.tokens > 0) {
          go(g, 'aim');
          g.aimLeft = AIM_TIME;
        } else {
          go(g, 'over');
          g.events.push({ type: 'over' });
        }
      }
      break;
    }
    case 'over':
      break;
  }

  if (g.held) {
    g.held.x = g.clawX;
    g.held.y = fingertips(g) - g.held.kind.r * 0.45;
    g.held.vx = g.held.vy = 0;
  }
  physics(g, dt);
  collectWinnings(g);
}

function go(g: Game, phase: Phase): void {
  g.phase = phase;
  g.t = 0;
}

/**
 * The plush the fingers would close on, if any: one whose middle is between the
 * fingers, low enough that they wrap around it. The nearest to the claw's centre wins.
 */
export function underClaw(g: Game): Prize | null {
  const tips = fingertips(g);
  let best: Prize | null = null;
  for (const p of g.prizes) {
    const dx = Math.abs(p.x - g.clawX);
    if (dx > REACH || tips < p.y - p.kind.r * 0.35) continue;
    if (!best || dx < Math.abs(best.x - g.clawX)) best = p;
  }
  return best;
}

/**
 * The fingers have closed: did they get anything? The nearer the plush's centre is to
 * the claw's, the firmer the grip. Too far off-centre and a finger just shoves it aside.
 */
function grab(g: Game): void {
  const best = underClaw(g);
  if (!best) {
    g.events.push({ type: 'miss', nudged: false });
    return;
  }
  const offset = Math.abs(best.x - g.clawX) / best.kind.r;
  if (offset > 0.75) {
    best.vx += Math.sign(best.x - g.clawX) * 90;
    best.vy -= 60;
    g.events.push({ type: 'miss', nudged: true });
    return;
  }
  g.held = best;
  g.grip = clamp(1 - offset * 0.9 - best.kind.slip, 0.05, 1);
  g.events.push({ type: 'grab', prize: best, grip: g.grip });
}

function maybeSlip(g: Game, dt: number): void {
  if (!g.held) return;
  const chance = 1 - Math.exp(-(1 - g.grip) * SLIP_RATE * dt);
  if (g.rand() < chance) {
    const prize = g.held;
    release(g);
    g.events.push({ type: 'slip', prize });
  }
}

function release(g: Game): void {
  if (g.held) g.held.vy = 20;
  g.held = null;
}

/** A plush that has dropped into the chute is won. */
function collectWinnings(g: Game): void {
  const keep: Prize[] = [];
  for (const p of g.prizes) {
    if (p !== g.held && p.x < CHUTE_X && p.y - p.kind.r > CHUTE_TOP) {
      g.won.push(p);
      g.events.push({ type: 'win', prize: p });
    } else keep.push(p);
  }
  g.prizes = keep;
}

/**
 * Plush physics, "position-based": move everything by its velocity, push apart whatever
 * overlaps (a few rounds, so the pile settles), and work out the velocity afterwards
 * from how far each one actually moved. Cheap, and it never explodes.
 */
export function physics(g: Game, dt: number): void {
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / n;
  for (let s = 0; s < n; s++) {
    const before = g.prizes.map((p) => [p.x, p.y]);
    for (const p of g.prizes) {
      if (p === g.held) continue;
      p.vy += GRAVITY * h;
      p.x += p.vx * h;
      p.y += p.vy * h;
    }
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < g.prizes.length; i++) {
        for (let j = i + 1; j < g.prizes.length; j++) separate(g, g.prizes[i], g.prizes[j]);
      }
      for (const p of g.prizes) if (p !== g.held) walls(p);
    }
    g.prizes.forEach((p, i) => {
      if (p === g.held) return;
      const [x0, y0] = before[i];
      p.vx = (p.x - x0) / h;
      p.vy = (p.y - y0) / h;
      const onFloor = p.y >= H - p.kind.r - 0.5;
      p.vx *= onFloor ? 0.9 : 0.995;
      p.spin += (p.x - x0) / p.kind.r;
      if (Math.abs(p.vx) < 2 && onFloor) p.vx = 0;
    });
  }
}

function separate(g: Game, a: Prize, b: Prize): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 0.001;
  const overlap = a.kind.r + b.kind.r - d;
  if (overlap <= 0) return;
  // Heavier (bigger) plush move less; the one in the claw doesn't move at all.
  const ma = a === g.held ? Infinity : a.kind.r ** 2;
  const mb = b === g.held ? Infinity : b.kind.r ** 2;
  const shareA = ma === Infinity ? 0 : mb === Infinity ? 1 : mb / (ma + mb);
  const shareB = 1 - shareA;
  const nx = dx / d;
  const ny = dy / d;
  a.x -= nx * overlap * shareA;
  a.y -= ny * overlap * shareA;
  b.x += nx * overlap * shareB;
  b.y += ny * overlap * shareB;
}

function walls(p: Prize): void {
  const r = p.kind.r;
  p.x = clamp(p.x, r, W - r);
  p.y = Math.min(p.y, H - r);
  // The chute's wall: a post from CHUTE_TOP down to the floor.
  const cy = clamp(p.y, CHUTE_TOP, H);
  const dx = p.x - CHUTE_X;
  const dy = p.y - cy;
  const d = Math.hypot(dx, dy);
  if (d < r && d > 0) {
    p.x = CHUTE_X + (dx / d) * r;
    p.y = cy + (dy / d) * r;
  } else if (d === 0) {
    p.x = CHUTE_X + r;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
