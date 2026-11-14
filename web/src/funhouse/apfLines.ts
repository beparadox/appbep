/**
 * What the Angry Packers Fan yells when he jumps out. Written in 2026 in APF's
 * 2009 voice: edit freely. Keep each line short (the test caps them at 60
 * characters) so it fits in the speech bubble on a phone.
 */

/** His first sighting: he's just noticed you. */
export const MEET = [
  "HEY! Whaddya think you're doin' in here?",
  'This is MY funhouse, pal.',
  'Ya want a piece of me? Do ya?',
  'Who let you in? Was it Favre? It was Favre.',
  "Quiz O' the Day: who am I? ...Too slow.",
];

/** He's following you now. */
export const FOLLOW = [
  'Oh, you thought you lost me?',
  'Right behind ya, buddy.',
  "I been followin' you since the foyer.",
  'Nice try. I know a shortcut.',
  'You run like a Bears linebacker.',
  "I'm not angry. THIS IS MY NORMAL VOICE.",
];

/** He's been following you for a while. */
export const UNHINGED = [
  'I live here now.',
  'Every room. Every door. ME.',
  'Go ahead, try the next door. I dare ya.',
  'Seven brats deep and still faster than you.',
  'Favre went to the VIKINGS and you just walk around?!',
  'LAMBEAU LEAP! Right in your face!',
];

/** You just walked into a wall. */
export const WALL = [
  "HA! Right into the wall. Nice route runnin'.",
  "That's a wall, genius.",
  'Even the Lions know that one is a wall.',
  'Flag on the play! Illegal use of a door!',
];

/** Extra lines for particular rooms (keys are room ids in rooms.ts). */
export const ROOM_LINES: Record<string, string[]> = {
  foyer: ['Welcome to the house! Now get out.'],
  parlor: ['Patience? I got none. Never had any.'],
  closet: ['Get outta my closet. I was here first.'],
  hallway: ["Thirteen doors and I'm behind every one."],
  mirrors: ["Which one's the real me? ALL OF 'EM."],
  arcade: ['Get offa my machine!', "High score? I'll show you a high score."],
  room1998: ['Sign my guestbook. Or ELSE.', 'Best viewed in Netscape and ANGER.'],
  stairs: ["Stairs to nowhere. Like the Lions' playoff hopes."],
  attic: ['Nobody comes up here. Except me. Always me.'],
};

/**
 * Dead ends where he's waiting with a smart remark (1 in 3 chance, instead of the
 * usual 20% for a wall). Keys are "<room id>/<door label>", exactly as in rooms.ts.
 */
export const DOOR_LINES: Record<string, string[]> = {
  'stairs/Climb the stairs': [
    'Watch your head! ...Oh. Too late.',
    'Seven steps and a ceiling. Just like the Lions.',
    "Goin' up? So's my blood pressure.",
    'Even Favre retires smarter than that.',
  ],
  'room1998/Enter the chat room': [
    "ELIZA's typin'. She's been typin' since 1998.",
    'Ask ELIZA how she feels about the Bears.',
  ],
  'room1998/Sign my guestbook!!': [
    'Guestbook closed. I signed the wall instead.',
    'Nobody reads that thing anyway. Except me.',
  ],
  'attic/A round window': [
    "It don't open. I tried. With my HEAD.",
    "Quit lookin' out the window. The game's IN here.",
  ],
};
