/**
 * The house. Each room is a page with exhibits and doors. A door can lead to
 * another room, into a wall, somewhere random, or around in a circle.
 * `map` is the room's spot on the floor plan (column, row).
 */
export type Door =
  | { label: string; to: string; note?: string }
  | { label: string; wall: string }
  | { label: string; random: true };

export interface Room {
  id: string;
  name: string;
  /** CSS theme class (see funhouse.css). */
  theme: string;
  intro: string;
  exhibits: string[];
  /** An exhibit shown working, in a display case (an iframe), above the plaques. */
  showcase?: string;
  doors: Door[];
  map: [number, number];
}

export const START = 'foyer';

export const ROOMS: Record<string, Room> = {
  foyer: {
    id: 'foyer',
    name: 'The Grand Foyer',
    theme: 'room-foyer',
    intro:
      'Velvet wallpaper. A chandelier hums. Someone has been building onto this house for a very long time and never stopped.',
    exhibits: [],
    doors: [
      { label: 'A heavy oak door', to: 'parlor' },
      { label: 'The long hallway', to: 'hallway' },
      { label: 'A grand staircase', to: 'stairs' },
      {
        label: 'A door marked EXIT',
        wall: 'It opens onto bricks. Somebody painted "lol" on them.',
      },
    ],
    map: [1, 2],
  },
  parlor: {
    id: 'parlor',
    name: 'The Parlor of Patience',
    theme: 'room-parlor',
    intro:
      'Puzzles that take exactly as long as they take. A grandfather clock ticks slightly too fast.',
    exhibits: ['hanoi', 'npuzzizzle'],
    doors: [
      { label: 'Back to the foyer', to: 'foyer' },
      { label: 'A very small door', to: 'closet' },
    ],
    map: [0, 2],
  },
  closet: {
    id: 'closet',
    name: 'A Closet',
    theme: 'room-closet',
    intro: 'Coats. Mothballs. A door in the back of the closet, which is not how closets work.',
    exhibits: [],
    doors: [
      {
        label: 'The door in the back',
        to: 'foyer',
        note: 'You step through and you are... back in the foyer. You did not come in this way.',
      },
    ],
    map: [0, 3],
  },
  hallway: {
    id: 'hallway',
    name: 'The Hallway That Keeps Going',
    theme: 'room-hallway',
    intro: 'Thirteen doors. The hallway is longer on the inside than the outside.',
    exhibits: [],
    doors: [
      { label: 'Door 1: back to the foyer', to: 'foyer' },
      { label: 'Door 2: the mirrors', to: 'mirrors' },
      { label: 'Door 3: noise and flashing lights', to: 'arcade' },
      { label: 'Door 4', wall: 'A wall. Behind it, faintly, a dial-up modem.' },
      { label: 'Door 7', to: 'room1998' },
      { label: 'Door 13', random: true },
    ],
    map: [1, 1],
  },
  mirrors: {
    id: 'mirrors',
    name: 'The Hall of Mirrors',
    theme: 'room-mirrors',
    intro: 'Everything here is out of order, then slowly put back in order.',
    exhibits: ['sorting'],
    doors: [
      { label: 'Back to the hallway', to: 'hallway' },
      {
        label: 'Your reflection’s door',
        to: 'mirrors',
        note: 'Your reflection goes through first. You end up exactly where you were.',
      },
    ],
    map: [0, 1],
  },
  arcade: {
    id: 'arcade',
    name: 'The Arcade',
    theme: 'room-arcade',
    intro: 'Cabinets glowing in the dark. INSERT COIN. (No coin needed.)',
    exhibits: ['wtfblaster', 'popfishies'],
    doors: [{ label: 'Back to the hallway', to: 'hallway' }],
    map: [2, 1],
  },
  room1998: {
    id: 'room1998',
    name: 'Welcome 2 My Homepage',
    theme: 'room-1998',
    intro: 'This room is a website. It is under construction. It has been since 1998.',
    exhibits: ['apf', 'schportz', 'duncans'],
    doors: [
      {
        label: 'Enter the chat room',
        wall: 'The chat room is down for maintenance. Someone named ELIZA is still logged in, typing.',
      },
      { label: '<< prev site in the webring', to: 'hallway' },
      { label: 'next site in the webring >>', random: true },
      {
        label: 'Sign my guestbook!!',
        wall: 'The guestbook is closed for repairs. It has been since 2003.',
      },
    ],
    map: [1, 0],
  },
  stairs: {
    id: 'stairs',
    name: 'The Staircase',
    theme: 'room-stairs',
    intro: 'A beautiful staircase that goes up seven steps and stops at the ceiling.',
    exhibits: [],
    doors: [
      {
        label: 'Climb the stairs',
        wall: 'Seven steps. Then ceiling. Your head finds it before your eyes do.',
      },
      {
        label: 'A cord hanging from the ceiling',
        to: 'attic',
        note: 'You pull the cord. A ladder unfolds. Dust everywhere.',
      },
      { label: 'Back down to the foyer', to: 'foyer' },
    ],
    map: [2, 2],
  },
  attic: {
    id: 'attic',
    name: 'The Attic',
    theme: 'room-attic',
    intro:
      'Where the old house’s furniture ended up. Under a sheet: the cube that used to sit on the front page.',
    showcase: 'bam-cube',
    exhibits: ['bam-cube', 'vocabulator'],
    doors: [
      { label: 'Climb back down the ladder', to: 'stairs' },
      { label: 'A round window', wall: 'It does not open. Outside, it is 2016.' },
    ],
    map: [2, 0],
  },
};

export const ROOM_IDS = Object.keys(ROOMS);
