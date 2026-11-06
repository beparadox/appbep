import { describe, expect, it } from 'vitest';
import { faceShowing, goTo, step, type Orientation } from './orientation';

const start: Orientation = { yaw: 0, pitch: 0 };

describe('cube orientation', () => {
  it('starts on the front face', () => expect(faceShowing(start)).toBe('front'));

  it('walks the ring when dragged left/right', () => {
    let o = start;
    const seen = [];
    for (let i = 0; i < 4; i++) seen.push(faceShowing((o = step(o, 'left'))));
    expect(seen).toEqual(['right', 'back', 'left', 'front']);
    expect(faceShowing(step(start, 'right'))).toBe('left');
  });

  it('pitches to top/bottom and back', () => {
    expect(faceShowing(step(start, 'down'))).toBe('top');
    expect(faceShowing(step(start, 'up'))).toBe('bottom');
    expect(faceShowing(step(step(start, 'down'), 'up'))).toBe('front');
    expect(step(step(start, 'down'), 'down')).toEqual({ yaw: 0, pitch: -1 }); // stays on top
  });

  it('leaving top/bottom sideways returns to the ring', () => {
    expect(faceShowing(step({ yaw: 0, pitch: -1 }, 'left'))).toBe('right');
  });

  it('goTo takes the shortest way', () => {
    expect(goTo(start, 'left')).toEqual({ yaw: 1, pitch: 0 }); // one step, not three
    expect(goTo(start, 'right')).toEqual({ yaw: -1, pitch: 0 });
    expect(Math.abs(goTo(start, 'back').yaw)).toBe(2);
    expect(goTo({ yaw: 7, pitch: 1 }, 'top')).toEqual({ yaw: 7, pitch: -1 });
    for (const f of ['front', 'right', 'back', 'left', 'top', 'bottom'] as const) {
      expect(faceShowing(goTo({ yaw: 5, pitch: 0 }, f))).toBe(f);
    }
  });
});
