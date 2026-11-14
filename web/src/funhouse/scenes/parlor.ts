import ParlorArt from './ParlorArt';
import type { Scene } from './types';

/** The Parlor of Patience (drawing in ParlorArt.tsx). Units: 600 × 480. */
export const parlor: Scene = {
  width: 600,
  height: 480,
  Art: ParlorArt,
  hotspots: [
    { kind: 'exhibit', id: 'hanoi', x: 98, y: 40, w: 164, h: 142, label: 'below' },
    { kind: 'exhibit', id: 'npuzzizzle', x: 345, y: 34, w: 152, h: 160, label: 'below' },
    {
      kind: 'door',
      id: 'Back to the foyer',
      x: 4,
      y: 145,
      w: 58,
      h: 312,
      label: 'above',
      align: 'start',
    },
    { kind: 'door', id: 'A very small door', x: 388, y: 304, w: 60, h: 60, label: 'above' },
  ],
};
