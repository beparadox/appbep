import type { Pokes } from './types';

/*
 * The Attic: under a steep roof, where the old house's furniture ended up.
 * A round window in the gable (moonlight and floating dust), the original
 * front-page cube on a crate under a half-pulled dust sheet, Vocabulator as
 * an index-card box on a steamer trunk, boxes, cobwebs, a tall something under
 * a sheet, and the ladder poking up through the hatch in the floor.
 *
 * Reacts to pokes (see attic.ts): the window gets "2016" written in its dust;
 * the sheet comes off (and goes back on) a rocking horse that never stops.
 *
 * Drawing units: 600 × 480.
 */

const INK = '#1a0d08';
const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const thin = { stroke: INK, strokeWidth: 1.5 } as const;

const MOTES: [number, number, number][] = [
  [292, 230, 0],
  [318, 270, 1.1],
  [305, 320, 2.3],
  [340, 360, 0.6],
  [288, 390, 1.7],
  [360, 410, 2.9],
  [326, 210, 3.4],
];

function Web({ x, y, flip = 1 }: { x: number; y: number; flip?: 1 | -1 }) {
  const s = (dx: number) => x + dx * flip;
  return (
    <g stroke="#cfc6b4" strokeWidth="1" fill="none" opacity="0.55">
      <path
        d={`M${x} ${y} L${s(46)} ${y + 6} M${x} ${y} L${s(36)} ${y + 30} M${x} ${y} L${s(8)} ${y + 44}`}
      />
      <path d={`M${s(16)} ${y + 2} Q${s(14)} ${y + 12} ${s(3)} ${y + 16}`} />
      <path d={`M${s(30)} ${y + 4} Q${s(26)} ${y + 22} ${s(6)} ${y + 30}`} />
      <path d={`M${s(42)} ${y + 6} Q${s(36)} ${y + 32} ${s(8)} ${y + 42}`} />
    </g>
  );
}

function RockingHorse() {
  return (
    <g className="attic-horse">
      <path
        d="M462 438 Q515 458 568 438"
        fill="none"
        stroke="#7a3a1a"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M462 438 Q515 458 568 438" fill="none" stroke={INK} strokeWidth="1.5" />
      {[
        [482, 444, 488, 398],
        [500, 449, 502, 400],
        [530, 449, 528, 400],
        [550, 444, 544, 398],
      ].map(([x1, y1, x2, y2]) => (
        <line
          key={x1}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#f2e6c4"
          strokeWidth="6"
          strokeLinecap="round"
        />
      ))}
      <ellipse cx="516" cy="388" rx="40" ry="18" fill="#f2e6c4" {...line} />
      <path d="M546 380 L560 340 L578 336 L582 352 L566 360 L556 392 Z" fill="#f2e6c4" {...line} />
      <path
        d="M556 342 Q544 352 548 372"
        fill="none"
        stroke="#c0392b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="570" cy="344" r="2" fill={INK} />
      <path
        d="M478 382 Q462 392 466 410"
        fill="none"
        stroke="#c0392b"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="500" y="368" width="26" height="9" rx="3" fill="#2f5a8a" {...thin} />
    </g>
  );
}

export default function AtticArt({ pokes }: { pokes: Pokes }) {
  const sheetOff = (pokes.sheet ?? 0) % 2 === 1;
  const written = (pokes['A round window'] ?? 0) > 0;
  return (
    <>
      <defs>
        <pattern id="attic-boards" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#4a3220" />
          <rect x="20" width="20" height="40" fill="#432d1c" />
        </pattern>
        <filter id="attic-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <radialGradient id="attic-sky" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#3b4f86" />
          <stop offset="1" stopColor="#141b33" />
        </radialGradient>
        <clipPath id="attic-glass">
          <circle cx="300" cy="150" r="34" />
        </clipPath>
        <linearGradient id="attic-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6e6ff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#d6e6ff" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="attic-dark" cx="50%" cy="40%" r="75%">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
      </defs>

      <g filter="url(#attic-ink)">
        {/* Roof slopes, knee walls, the gable wall, and the floor */}
        <rect width="600" height="480" fill="#1c130c" />
        <polygon points="300,40 150,170 0,300 0,0 300,0" fill="#3a2717" {...line} />
        <polygon points="300,40 450,170 600,300 600,0 300,0" fill="#3a2717" {...line} />
        {[
          [300, 28, 118, 198],
          [300, 12, 70, 240],
          [300, -4, 22, 282],
          [300, 28, 482, 198],
          [300, 12, 530, 240],
          [300, -4, 578, 282],
        ].map(([x1, y1, x2, y2]) => (
          <line
            key={`${x2}-${y2}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#24170d"
            strokeWidth="9"
          />
        ))}
        <polygon points="150,170 150,330 0,420 0,300" fill="#2e1f12" {...line} />
        <polygon points="450,170 450,330 600,420 600,300" fill="#2e1f12" {...line} />
        <polygon
          points="150,330 150,170 300,40 450,170 450,330"
          fill="url(#attic-boards)"
          {...line}
        />
        <polygon points="150,330 450,330 600,420 600,480 0,480 0,420" fill="#5a3d24" {...line} />
        {[
          [210, 150],
          [270, 245],
          [330, 355],
          [390, 455],
        ].map(([x1, x2]) => (
          <line key={x1} x1={x1} y1="330" x2={x2} y2="480" stroke="#3e2a18" strokeWidth="2" />
        ))}

        {/* Round window (dead end): moon, stars, dust */}
        <circle cx="300" cy="150" r="42" fill="#5b3a1e" {...line} />
        <circle cx="300" cy="150" r="34" fill="url(#attic-sky)" {...line} strokeWidth={2} />
        <g clipPath="url(#attic-glass)">
          <circle cx="312" cy="138" r="11" fill="#f3ecd2" />
          <circle cx="317" cy="134" r="10" fill="#2c3b66" />
          {[
            [282, 132],
            [292, 168],
            [322, 168],
            [276, 156],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill="#fff" />
          ))}
          <rect x="260" y="110" width="80" height="80" fill="#d8d0bc" opacity="0.22" />
        </g>
        <line x1="300" y1="116" x2="300" y2="184" stroke="#5b3a1e" strokeWidth="4" />
        <line x1="266" y1="150" x2="334" y2="150" stroke="#5b3a1e" strokeWidth="4" />

        <Web x={152} y={172} />
        <Web x={448} y={172} flip={-1} />

        {/* Boxes */}
        <rect x="160" y="300" width="50" height="32" fill="#a07848" {...line} strokeWidth={2} />
        <rect x="206" y="290" width="48" height="42" fill="#b08a58" {...line} strokeWidth={2} />
        <rect x="172" y="270" width="42" height="30" fill="#9a7244" {...line} strokeWidth={2} />
        <text
          x="185"
          y="320"
          textAnchor="middle"
          fontSize="9"
          fontFamily="'Comic Sans MS', cursive"
          fill="#2a1a0e"
        >
          XMAS
        </text>
        <text
          x="230"
          y="308"
          textAnchor="middle"
          fontSize="8"
          fontFamily="'Comic Sans MS', cursive"
          fill="#2a1a0e"
        >
          TAXES
        </text>
        <text
          x="230"
          y="319"
          textAnchor="middle"
          fontSize="8"
          fontFamily="'Comic Sans MS', cursive"
          fill="#2a1a0e"
        >
          1998
        </text>
        <text
          x="193"
          y="283"
          textAnchor="middle"
          fontSize="6.5"
          fontFamily="'Comic Sans MS', cursive"
          fill="#8b1e1e"
        >
          DO NOT
        </text>
        <text
          x="193"
          y="292"
          textAnchor="middle"
          fontSize="6.5"
          fontFamily="'Comic Sans MS', cursive"
          fill="#8b1e1e"
        >
          OPEN
        </text>

        {/* Steamer trunk, and Vocabulator: an index-card box */}
        <rect x="18" y="384" width="126" height="66" rx="4" fill="#6b3f1d" {...line} />
        <rect x="18" y="376" width="126" height="16" rx="6" fill="#7a4a26" {...line} />
        {[42, 120].map((x) => (
          <rect key={x} x={x - 5} y="376" width="10" height="74" fill="#3a2414" {...thin} />
        ))}
        <rect x="74" y="404" width="14" height="14" rx="2" fill="#c9973f" {...thin} />
        <rect x="44" y="334" width="76" height="42" fill="#7a5230" {...line} />
        {[52, 62, 72, 82, 92, 102].map((x, i) => (
          <g key={x}>
            <rect x={x} y={318 + (i % 3) * 3} width="12" height="20" fill="#f6efdc" {...thin} />
          </g>
        ))}
        <rect x="60" y="346" width="44" height="16" fill="#efe2c8" {...thin} />
        <text
          x="82"
          y="358"
          textAnchor="middle"
          fontSize="10"
          fontFamily="Georgia, serif"
          fontWeight="bold"
          fill="#4a2d14"
        >
          A–Z
        </text>

        {/* The original cube, on a crate, half under a dust sheet */}
        <rect x="330" y="362" width="96" height="58" fill="#8a6a42" {...line} />
        <line x1="330" y1="381" x2="426" y2="381" stroke="#5b4128" strokeWidth="2" />
        <line x1="330" y1="400" x2="426" y2="400" stroke="#5b4128" strokeWidth="2" />
        <polygon
          points="350,312 396,312 410,300 364,300"
          fill="#e58e3c"
          {...line}
          strokeWidth={2}
        />
        <polygon
          points="396,312 410,300 410,346 396,358"
          fill="#4f9a6a"
          {...line}
          strokeWidth={2}
        />
        <rect x="350" y="312" width="46" height="46" fill="#5aa7d6" {...line} strokeWidth={2} />
        <path
          d="M362 335 L356 335 M356 335 L360 331 M356 335 L360 339"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M384 335 L390 335 M390 335 L386 331 M390 335 L386 339"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M346 298 Q362 292 372 302 L366 330 Q356 352 342 364 L322 424 L344 424 Q336 396 352 372 L340 362 Z"
          fill="#e9e4d8"
          {...line}
          strokeWidth={2}
        />

        {/* The hatch in the floor, with the top of the ladder */}
        <polygon points="182,440 292,440 304,480 170,480" fill="#0b0604" {...line} />
        <line
          x1="204"
          y1="480"
          x2="208"
          y2="402"
          stroke="#8a6a42"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="270"
          y1="480"
          x2="266"
          y2="402"
          stroke="#8a6a42"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {[418, 440, 462].map((y) => (
          <line key={y} x1="207" y1={y} x2="268" y2={y} stroke="#8a6a42" strokeWidth="5" />
        ))}
      </g>

      {/* Moonlight through the window, with dust in it */}
      <polygon
        points="282,152 318,152 430,470 236,470"
        fill="url(#attic-beam)"
        pointerEvents="none"
      />
      {MOTES.map(([x, y, delay]) => (
        <circle
          key={`${x}-${y}`}
          className="attic-mote"
          cx={x}
          cy={y}
          r="1.6"
          fill="#fff8e0"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}

      {written && (
        <text
          className="attic-2016"
          x="300"
          y="160"
          textAnchor="middle"
          fontFamily="'Comic Sans MS', 'Chalkboard SE', cursive"
          fontSize="20"
          fill="#0f1528"
          opacity="0.85"
          clipPath="url(#attic-glass)"
        >
          2016
        </text>
      )}

      {/* The tall something: a sheet, or (sheet off) a rocking horse and the sheet on the floor */}
      <g key={sheetOff ? 'off' : 'on'} filter="url(#attic-ink)">
        {sheetOff ? (
          <>
            <path
              d="M458 452 Q470 436 492 448 Q512 438 528 452 Q548 444 566 456 Z"
              fill="#e9e4d8"
              {...line}
              strokeWidth={2}
            />
            <RockingHorse />
          </>
        ) : (
          <g className="attic-sheet">
            <path
              d="M470 448 Q462 400 478 368 Q486 330 520 326 Q548 324 560 350 Q578 386 572 448 Q560 440 548 450 Q534 440 520 450 Q506 440 494 450 Q482 440 470 448 Z"
              fill="#e9e4d8"
              {...line}
            />
            <path
              d="M500 360 Q504 400 498 440 M540 356 Q548 400 546 440"
              fill="none"
              stroke="#b9b2a2"
              strokeWidth="2"
            />
          </g>
        )}
      </g>

      <rect width="600" height="480" fill="url(#attic-dark)" pointerEvents="none" />
    </>
  );
}
