/**
 * Cube orientation model.
 *
 * The four side faces form a ring reached by yaw (rotateY) in 90° steps; top and bottom are
 * reached by pitching (rotateX) ±90° from whichever ring face is showing. yaw is an unbounded
 * step count so the cube always spins the short way instead of unwinding.
 */
export const RING = ['front', 'right', 'back', 'left'] as const;
export type FaceId = (typeof RING)[number] | 'top' | 'bottom';
export type Orientation = { yaw: number; pitch: -1 | 0 | 1 }; // pitch -1 = top showing
export type Direction = 'left' | 'right' | 'up' | 'down';

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function faceShowing({ yaw, pitch }: Orientation): FaceId {
  if (pitch === -1) return 'top';
  if (pitch === 1) return 'bottom';
  return RING[mod(-yaw, 4)]!;
}

/** "Direction" is the way the user drags the cube. */
export function step(o: Orientation, dir: Direction): Orientation {
  switch (dir) {
    case 'left': // drag left -> the face on the right comes into view
      return { yaw: o.yaw - 1, pitch: 0 };
    case 'right':
      return { yaw: o.yaw + 1, pitch: 0 };
    case 'up': // drag up -> the bottom face rises into view
      return { yaw: o.yaw, pitch: o.pitch === -1 ? 0 : 1 };
    case 'down':
      return { yaw: o.yaw, pitch: o.pitch === 1 ? 0 : -1 };
  }
}

/** Shortest rotation from the current orientation to show `face`. */
export function goTo(o: Orientation, face: FaceId): Orientation {
  if (face === 'top') return { yaw: o.yaw, pitch: -1 };
  if (face === 'bottom') return { yaw: o.yaw, pitch: 1 };
  const target = RING.indexOf(face); // ring index i shows when -yaw ≡ i (mod 4)
  const current = mod(-o.yaw, 4);
  let delta = mod(target - current, 4); // forward steps around the ring
  if (delta === 3) delta = -1;
  return { yaw: o.yaw - delta, pitch: 0 };
}
