import ArcadeArt from './ArcadeArt';
import type { Scene } from './types';

/** The Arcade (drawing in ArcadeArt.tsx). Units: 600 × 480. */
export const arcade: Scene = {
  width: 600,
  height: 480,
  Art: ArcadeArt,
  hotspots: [
    {
      kind: 'door',
      id: 'Back to the hallway',
      x: 14,
      y: 190,
      w: 92,
      h: 232,
      label: 'below',
      align: 'start',
    },
    { kind: 'exhibit', id: 'wtfblaster', x: 222, y: 136, w: 112, h: 290, label: 'below' },
    { kind: 'exhibit', id: 'popfishies', x: 344, y: 136, w: 112, h: 290, label: 'below' },
    {
      kind: 'prop',
      id: 'scores',
      name: 'High scores',
      poke: 'scores',
      x: 104,
      y: 62,
      w: 108,
      h: 160,
      label: 'below',
      says: [
        'HIGH SCORES. BAM, BAM, BAM, BAM. Then APF, with one point. You get the feeling he is furious about it.',
        'Your name is on the board now: YOU, 000000. You haven’t played anything.',
        'The board flickers. For a second APF is at the top. Then, when you look again, he isn’t.',
      ],
    },
    {
      kind: 'prop',
      id: 'change',
      name: 'A change machine',
      poke: 'change',
      x: 108,
      y: 264,
      w: 98,
      h: 150,
      label: 'above',
      says: [
        'It gives you a token. The token says NO COIN NEEDED.',
        'Another token. You now have two tokens and nothing to spend them on.',
        'It is out of tokens. It apologizes in a series of beeps.',
      ],
    },
    {
      kind: 'prop',
      id: 'claw',
      name: 'The claw machine',
      poke: 'claw',
      x: 466,
      y: 146,
      w: 128,
      h: 278,
      label: 'below',
      align: 'end',
      says: [
        'The claw drops without a coin. It grabs nothing, and looks pleased with itself anyway.',
        'Again. It almost gets the purple one. Almost is the whole business model.',
        'A sticker inside the glass: SKILL TESTER. Nobody has passed.',
      ],
    },
  ],
};
