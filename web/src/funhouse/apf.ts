import { DOOR_LINES, FOLLOW, MEET, ROOM_LINES, UNHINGED, WALL } from './apfLines';

/**
 * The Angry Packers Fan, lurking in the funhouse.
 *
 * He's an occasional surprise, not a constant: 20% per room (never in your
 * first two rooms, and never two rooms in a row), 20% when you walk into a
 * wall, and 1 in 3 at a few dead ends that he has something to say about
 * (DOOR_LINES). He doesn't get more frequent, just angrier: his lines go from
 * "who are you" to "following you" to "I live here now".
 *
 * Kept per page load (not saved), so a fresh visit starts with a fresh fan.
 */
export interface Stalker {
  /** How many times he's jumped out at you. */
  sightings: number;
  /** Rooms entered since he last jumped out. */
  roomsSince: number;
  /** Lines already used, so he doesn't repeat himself until he runs out. */
  said: string[];
}

export const ROOM_CHANCE = 0.2;
export const WALL_CHANCE = 0.2;
export const SPECIAL_DOOR_CHANCE = 1 / 3;

export const newStalker = (): Stalker => ({ sightings: 0, roomsSince: 0, said: [] });

/** The chance he jumps out when you enter a room (your `visits`-th room this visit). */
export function appearChance(s: Stalker, visits: number): number {
  if (visits <= 2) return 0;
  if (s.sightings > 0 && s.roomsSince < 2) return 0; // he was in the room you just left
  return ROOM_CHANCE;
}

/** How DOOR_LINES names a door: "<room id>/<door label>". */
export const doorKey = (room: string, door: string) => `${room}/${door}`;

/** The chance he jumps out when you walk into the wall behind a door. */
export const wallChance = (room: string, door: string): number =>
  DOOR_LINES[doorKey(room, door)] ? SPECIAL_DOOR_CHANCE : WALL_CHANCE;

export interface Context {
  room: string;
  /** He's laughing at you for walking into the wall behind this door. */
  wall?: string;
}

/** Which lines he can say next. */
export function candidates(s: Stalker, ctx: Context, roll: number): string[] {
  if (ctx.wall) return DOOR_LINES[doorKey(ctx.room, ctx.wall)] ?? WALL;
  if (s.sightings === 0) return MEET;
  const roomLines = ROOM_LINES[ctx.room];
  if (roomLines && roll < 0.5) return roomLines;
  return s.sightings < 3 ? FOLLOW : UNHINGED;
}

/** Pick his line (avoiding repeats), and record the sighting. */
export function jumpOut(
  s: Stalker,
  ctx: Context,
  rand: () => number = Math.random,
): { line: string; next: Stalker } {
  const pool = candidates(s, ctx, rand());
  const fresh = pool.filter((l) => !s.said.includes(l));
  const from = fresh.length ? fresh : pool;
  const line = from[Math.floor(rand() * from.length)];
  return {
    line,
    next: { sightings: s.sightings + 1, roomsSince: 0, said: [...s.said, line] },
  };
}

export const enteredRoom = (s: Stalker): Stalker => ({ ...s, roomsSince: s.roomsSince + 1 });
