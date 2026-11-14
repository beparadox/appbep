import ClosetArt from './ClosetArt';
import type { Scene } from './types';

/** A Closet (drawing in ClosetArt.tsx). Units: 600 × 480. Poke the props; edit what they say. */
export const closet: Scene = {
  width: 600,
  height: 480,
  Art: ClosetArt,
  hotspots: [
    { kind: 'door', id: 'The door in the back', x: 262, y: 162, w: 76, h: 240, label: 'below' },
    {
      kind: 'prop',
      id: 'light',
      name: 'A pull chain',
      poke: 'light',
      x: 276,
      y: 14,
      w: 50,
      h: 90,
      label: 'below',
      says: [
        'Click. Darkness. Something in the coats breathes out.',
        'Click. Light. Everything is exactly where it was. Probably.',
      ],
    },
    {
      kind: 'prop',
      id: 'coats-left',
      name: 'Coats',
      poke: 'coats',
      x: 122,
      y: 134,
      w: 138,
      h: 216,
      says: [
        'You check a pocket: a ticket stub. Super Bowl II, January 1968.',
        'The coats sway. One of them sways back.',
        'Another pocket: lint, a bottle cap, and a note that says "turn back".',
      ],
    },
    {
      kind: 'prop',
      id: 'coats-right',
      name: 'More coats',
      poke: 'coats',
      x: 340,
      y: 134,
      w: 138,
      h: 216,
      says: [
        'The purple one is covered in sequins. It is not your size. It is nobody’s size.',
        'You push the coats aside. They push back.',
        'The green parka has a lift ticket from 1979 and a half-eaten granola bar.',
      ],
    },
    {
      kind: 'prop',
      id: 'cheesehead',
      name: 'A cheesehead',
      poke: 'cheesehead',
      x: 344,
      y: 54,
      w: 96,
      h: 50,
      label: 'below',
      says: [
        'A cheesehead. Size XXXL. Still warm.',
        'Written inside, in marker: PROPERTY OF A.P.F. DO NOT TOUCH.',
      ],
    },
    {
      kind: 'prop',
      id: 'mothballs',
      name: 'Mothballs',
      poke: 'mothballs',
      x: 160,
      y: 418,
      w: 76,
      h: 56,
      label: 'above',
      says: [
        'A mothball rolls away. It smells like 1962.',
        'Someone has arranged the mothballs into a little smiley face. It is frowning now.',
        'You leave the mothballs alone. The mothballs do not leave you alone.',
      ],
    },
  ],
};
