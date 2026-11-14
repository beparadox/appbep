import StairsArt from './StairsArt';
import type { Scene } from './types';

/** The Staircase (drawing in StairsArt.tsx). Units: 600 × 480. */
export const stairs: Scene = {
  width: 600,
  height: 480,
  Art: StairsArt,
  hotspots: [
    { kind: 'door', id: 'Climb the stairs', x: 184, y: 116, w: 272, h: 322, label: 'below' },
    {
      kind: 'door',
      id: 'A cord hanging from the ceiling',
      x: 84,
      y: 46,
      w: 56,
      h: 192,
      label: 'above',
      align: 'start',
    },
    {
      kind: 'door',
      id: 'Back down to the foyer',
      x: 18,
      y: 284,
      w: 124,
      h: 180,
      label: 'above',
      align: 'start',
    },
    {
      kind: 'prop',
      id: 'portrait',
      name: 'A portrait',
      poke: 'portrait',
      x: 490,
      y: 150,
      w: 92,
      h: 128,
      label: 'below',
      align: 'end',
      says: [
        'A portrait of whoever built this house. She is holding a hammer and a roll of plans marked MORE.',
        'Her eyes follow you. Not in a spooky way. In a judging way.',
        'The little brass plate says: "She never stopped building."',
      ],
    },
    {
      kind: 'prop',
      id: 'newel',
      name: 'The newel post',
      poke: 'newel',
      x: 138,
      y: 300,
      w: 52,
      h: 70,
      label: 'below',
      says: [
        'The knob on the post comes off in your hand. You put it back. It is now slightly crooked.',
        'Someone has carved a tally into the post. Thirty-seven marks. Thirty-eight.',
      ],
    },
  ],
};
