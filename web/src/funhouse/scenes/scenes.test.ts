import { describe, expect, it } from 'vitest';
import { ROOMS } from '../rooms';
import { SCENES } from '.';

/** A hotspot this many drawing units across is ~30px on a 375px-wide phone. */
const MIN_TOUCH = 48;

describe.each(Object.entries(SCENES))('the %s scene', (roomId, scene) => {
  const room = ROOMS[roomId];
  const of = (kind: 'door' | 'exhibit') =>
    scene.hotspots.filter((h) => h.kind === kind).map((h) => h.id);

  it('belongs to a real room', () => expect(room).toBeDefined());

  it('has every door in the room, and no others', () => {
    expect(of('door').sort()).toEqual(room.doors.map((d) => d.label).sort());
  });

  it('has every exhibit in the room, and no others', () => {
    expect(of('exhibit').sort()).toEqual([...room.exhibits].sort());
  });

  it('keeps every hotspot inside the picture and big enough to tap', () => {
    for (const h of scene.hotspots) {
      expect(h.x, h.id).toBeGreaterThanOrEqual(0);
      expect(h.y, h.id).toBeGreaterThanOrEqual(0);
      expect(h.x + h.w, h.id).toBeLessThanOrEqual(scene.width);
      expect(h.y + h.h, h.id).toBeLessThanOrEqual(scene.height);
      expect(Math.min(h.w, h.h), h.id).toBeGreaterThanOrEqual(MIN_TOUCH);
    }
  });
});
