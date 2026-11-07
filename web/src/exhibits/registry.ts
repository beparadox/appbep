/**
 * Every old project, in one place. The /projects page and the funhouse both read
 * from this list, so an exhibit only has to be described once.
 *
 * Placard text is a DRAFT for Bambridge to rewrite.
 */
export type ExhibitKind = 'game' | 'app' | 'demo' | 'site';

export interface Exhibit {
  id: string;
  title: string;
  kind: ExhibitKind;
  year: string;
  tech: string[];
  blurb: string;
  /** The "how it works" nugget on the placard. */
  lesson: string;
  /** True once the vintage copy lives in public/exhibits/<id>/ (Phase 3+). */
  live?: boolean;
  /** Where the old app runs locally (~/dev/appbep-legacy). Dev builds link here. */
  legacy?: { port: number; path: string };
}

export const EXHIBITS: Exhibit[] = [
  {
    id: 'wtfblaster',
    title: 'WTF Blaster',
    kind: 'game',
    year: '2013–15',
    tech: ['JavaScript', 'Canvas', 'Google App Engine'],
    blurb: 'A 30-second shoot-em-up drawn frame by frame on an HTML canvas: Packers vs. Bears.',
    lesson:
      'Games like this run a "game loop": about 60 times a second, update every object\'s position, check for collisions, then redraw the whole screen.',
    live: true,
  },
  {
    id: 'popfishies',
    title: 'POPFishies',
    kind: 'game',
    year: '2014',
    tech: ['JavaScript', 'Canvas'],
    blurb: 'Fish swim by. You pop them. That is the whole game, and it is enough.',
    lesson:
      'Clicking a moving target means testing the mouse point against each fish\'s shape, called "hit testing", usually by checking the distance to its center.',
    live: true,
  },
  {
    id: 'npuzzizzle',
    title: 'NPuzzizzle',
    kind: 'game',
    year: '2013–15',
    tech: ['JavaScript', 'RequireJS', 'Handlebars', 'AWS Lambda'],
    blurb: 'The sliding-tile puzzle, against the clock, with a leaderboard.',
    lesson:
      'Half of all shuffled sliding puzzles can never be solved. Swap any two tiles of a solved board and no amount of sliding will fix it, so a fair shuffle has to be made by sliding.',
    live: true,
  },
  {
    id: 'vocabulator',
    title: 'Vocabulator',
    kind: 'app',
    year: 'c. 2015',
    tech: ['JavaScript', 'Backbone.js'],
    blurb: 'A personal vocabulary list: add words you want to learn, then quiz yourself on them.',
    lesson:
      'Backbone.js was one of the first popular ways to organize a browser app: "models" hold the data, "views" draw it, and when a model changes, its views redraw themselves. React later made that redraw automatic.',
    legacy: { port: 8084, path: '/vocabulator/local' },
  },
  {
    id: 'bam-cube',
    title: 'The Original Cube',
    kind: 'demo',
    year: 'c. 2016',
    tech: ['CSS 3D transforms', 'JavaScript'],
    blurb: 'The spinning cube from the old appbep.com homepage, restored. Push the arrows.',
    lesson:
      'Each face is a flat square pushed out from the center and turned to face outward. Spinning the cube is just two rotations, X then Y, and the order matters: turn it up first and "left" no longer means what you think. That is why it sometimes tumbles the wrong way.',
    live: true,
  },
  {
    id: 'hanoi',
    title: 'Towers of Hanoi',
    kind: 'demo',
    year: '2013–14',
    tech: ['JavaScript', 'Animation'],
    blurb: 'Moving a stack of disks one at a time, never putting a big disk on a small one.',
    lesson:
      'The textbook example of recursion: to move n disks, move n−1 out of the way, move the biggest, then move the n−1 back on top. It always takes 2ⁿ−1 moves; 64 disks would take longer than the age of the universe.',
    live: true,
  },
  {
    id: 'sorting',
    title: 'Sorting Animations',
    kind: 'demo',
    year: 'c. 2016',
    tech: ['JavaScript', 'Animation'],
    blurb: 'Bubble, selection, insertion, merge and quick sort, one at a time, in slow motion.',
    lesson:
      'Bubble, selection and insertion sort compare roughly every pair (n² steps); merge and quick sort split the list in half again and again (about n·log n). For a million items, that is the difference between a trillion steps and twenty million.',
    live: true,
  },
  {
    id: 'schportz',
    title: 'Schportz Quiz of the Day',
    kind: 'site',
    year: '2010–11',
    tech: ['PHP', 'MySQL'],
    blurb: 'A daily sports quiz. The questions were recovered from a 2011 database dump.',
    lesson:
      'A database "dump" is just a text file of SQL commands that rebuild the tables row by row, which is why fifteen-year-old questions could be brought back to life.',
    legacy: { port: 8083, path: '/' },
  },
  {
    id: 'duncans',
    title: "Duncan's Auto & Truck Repair",
    kind: 'site',
    year: '2010',
    tech: ['XHTML', 'CSS', 'JavaScript', 'PHP'],
    blurb:
      'A website for a family auto shop, shown as screenshots only. Not affiliated with the business; contact details removed.',
    lesson:
      'Sites of 2010 were often laid out with fixed-width boxes floated side by side, sized for an 800- or 1024-pixel-wide screen. The little "Valid XHTML" badges in the footer were a point of pride: proof the page passed the W3C validator.',
    live: true,
  },
  {
    id: 'memorial',
    title: 'Patricia Ann Peterson Memorial',
    kind: 'site',
    year: '2014',
    tech: ['HTML', 'Bootstrap 3', 'jQuery', 'Google App Engine'],
    blurb: 'A memorial page for my mother. This version keeps the photos only.',
    lesson:
      'The original ran on Google App Engine with a guestbook protected by reCAPTCHA. This copy is a single static page: no server, no guestbook, and the photos have new file names with their metadata stripped.',
    live: true,
  },
  {
    id: 'apf',
    title: 'Angry Packers Fan',
    kind: 'site',
    year: '2009',
    tech: ['PHP', 'MySQL', 'Photoshop'],
    blurb: "A fan site with a bio, an FAQ, and the Packers Quiz O' the Day. Facts as of 2009.",
    lesson:
      'Sites of this era built every page on the server: PHP pulled rows from MySQL and stitched them into HTML before sending it. Today most of that work happens in the browser.',
    legacy: { port: 8085, path: '/' },
  },
];

export const KIND_LABEL: Record<ExhibitKind, string> = {
  game: 'Games',
  app: 'Apps',
  demo: 'Demos',
  site: 'Sites',
};

export function exhibit(id: string): Exhibit {
  const e = EXHIBITS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown exhibit: ${id}`);
  return e;
}

/**
 * Where an exhibit opens, or null if it isn't viewable yet.
 * In dev, unported exhibits link to the old app in its Podman container
 * (using the current hostname, so it also works from a phone on the LAN).
 */
export function exhibitHref(e: Exhibit): string | null {
  if (e.live) return `/exhibits/${e.id}/`;
  if (import.meta.env.DEV && e.legacy) {
    return `http://${window.location.hostname}:${e.legacy.port}${e.legacy.path}`;
  }
  return null;
}
