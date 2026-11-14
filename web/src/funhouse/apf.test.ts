import { describe, expect, it } from 'vitest';
import {
  appearChance,
  candidates,
  enteredRoom,
  jumpOut,
  newStalker,
  wallChance,
  type Stalker,
} from './apf';
import { DOOR_LINES, FOLLOW, MEET, ROOM_LINES, UNHINGED, WALL } from './apfLines';
import { ROOMS } from './rooms';

const seen = (sightings: number, roomsSince = 0): Stalker => ({
  sightings,
  roomsSince,
  said: [],
});

describe('when the APF jumps out', () => {
  it('never in your first two rooms, then 20%', () => {
    expect(appearChance(newStalker(), 1)).toBe(0);
    expect(appearChance(newStalker(), 2)).toBe(0);
    expect(appearChance(newStalker(), 3)).toBe(0.2);
  });

  it("doesn't get more frequent the more you see him", () => {
    expect(appearChance(seen(1, 5), 9)).toBe(0.2);
    expect(appearChance(seen(20, 5), 9)).toBe(0.2);
  });

  it('never two rooms in a row', () => {
    const justSeen = enteredRoom(jumpOut(newStalker(), { room: 'foyer' }, () => 0).next);
    expect(appearChance(justSeen, 9)).toBe(0);
    expect(appearChance(enteredRoom(justSeen), 9)).toBe(0.2);
  });

  it('20% at a wall, 1 in 3 at the dead ends he likes', () => {
    expect(wallChance('foyer', 'A door marked EXIT')).toBe(0.2);
    expect(wallChance('stairs', 'Climb the stairs')).toBeCloseTo(1 / 3);
  });
});

describe('what the APF says', () => {
  it('meets you first, then follows, then comes unhinged', () => {
    expect(candidates(seen(0), { room: 'arcade' }, 0)).toBe(MEET);
    expect(candidates(seen(1), { room: 'nowhere' }, 0)).toBe(FOLLOW);
    expect(candidates(seen(3), { room: 'nowhere' }, 0)).toBe(UNHINGED);
  });

  it('sometimes has something to say about the room', () => {
    expect(candidates(seen(1), { room: 'arcade' }, 0.1)).toBe(ROOM_LINES.arcade);
    expect(candidates(seen(1), { room: 'arcade' }, 0.9)).toBe(FOLLOW);
  });

  it('laughs when you walk into a wall, with a special remark at some', () => {
    expect(candidates(seen(0), { room: 'foyer', wall: 'A door marked EXIT' }, 0)).toBe(WALL);
    expect(candidates(seen(0), { room: 'stairs', wall: 'Climb the stairs' }, 0)).toBe(
      DOOR_LINES['stairs/Climb the stairs'],
    );
  });

  it("doesn't repeat himself until he runs out", () => {
    const ctx = { room: 'foyer', wall: 'A door marked EXIT' };
    let s = newStalker();
    const lines = [];
    for (let i = 0; i < WALL.length; i++) {
      const r = jumpOut(s, ctx, () => 0);
      lines.push(r.line);
      s = r.next;
    }
    expect(new Set(lines).size).toBe(WALL.length);
    expect(WALL).toContain(jumpOut(s, ctx, () => 0).line);
  });

  it('counts the sighting and resets the distance', () => {
    const { next } = jumpOut(seen(2, 3), { room: 'foyer' }, () => 0);
    expect(next.sightings).toBe(3);
    expect(next.roomsSince).toBe(0);
  });

  it('only has lines for real rooms and real dead ends', () => {
    for (const room of Object.keys(ROOM_LINES)) expect(ROOMS).toHaveProperty(room);
    for (const key of Object.keys(DOOR_LINES)) {
      const [room, label] = key.split('/');
      const door = ROOMS[room]?.doors.find((d) => d.label === label);
      expect(door, key).toBeDefined();
      expect(door && 'wall' in door, `${key} should be a wall`).toBe(true);
    }
  });

  it('keeps every line short enough for a phone', () => {
    const all = [MEET, FOLLOW, UNHINGED, WALL, ...Object.values(ROOM_LINES)];
    for (const line of [...all, ...Object.values(DOOR_LINES)].flat()) {
      expect(line.length, line).toBeLessThanOrEqual(60);
    }
  });
});
