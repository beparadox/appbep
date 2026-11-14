import type { Pokes } from './types';

/*
 * The Staircase: a grand staircase, red runner and polished banisters, that
 * climbs seven steps straight into the ceiling. A trapdoor in the ceiling with
 * a cord (to the attic), an archway with steps going down (to the foyer), a
 * portrait of the house's builder, and a potted fern.
 *
 * Each time you climb the stairs (pokes['Climb the stairs']), a BONK! goes off
 * where the top step meets the ceiling, and a crack spreads in the plaster (up
 * to three). After the second, someone hangs a sign.
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

const CX = 320;
const CEILING = 112;

/** Step i (0 = bottom): the bottom edge of its riser, and its half-width. */
const STEPS = Array.from({ length: 7 }, (_, i) => ({ yb: 460 - i * 50, w: 160 - i * 12 }));
const RISER = 36;
const TREAD = 14;

/** Banister geometry for one side (-1 = left, 1 = right). */
function banister(side: -1 | 1) {
  const posts = STEPS.map(({ yb, w }) => ({ x: CX + side * (w - 12), base: yb - 43 }));
  const newelX = CX + side * 157;
  const rail = [`${newelX},322`, ...posts.map((p) => `${p.x},${p.base - 72}`)].join(' ');
  return { posts, newelX, rail };
}

const CRACKS = [
  'M320 112 L298 96 L304 84 L286 70',
  'M322 112 L348 100 L344 88 L366 76 L362 62',
  'M318 112 L300 108 L274 104 L262 92',
];

function Banister({ side }: { side: -1 | 1 }) {
  const { posts, newelX, rail } = banister(side);
  return (
    <g>
      {posts.map((p) => (
        <line
          key={p.base}
          x1={p.x}
          y1={p.base}
          x2={p.x}
          y2={p.base - 72}
          stroke="#efe2c8"
          strokeWidth="5"
        />
      ))}
      {posts.map((p) => (
        <line
          key={`o${p.base}`}
          x1={p.x}
          y1={p.base}
          x2={p.x}
          y2={p.base - 72}
          stroke={INK}
          strokeWidth="1"
          opacity="0.5"
        />
      ))}
      <polyline points={rail} fill="none" stroke={INK} strokeWidth="11" strokeLinejoin="round" />
      <polyline points={rail} fill="none" stroke="#5a2a12" strokeWidth="7" strokeLinejoin="round" />
      {/* Newel post */}
      <rect x={newelX - 13} y="330" width="26" height="130" fill="#5a2a12" {...line} />
      <rect x={newelX - 17} y="322" width="34" height="12" fill="#6b3418" {...line} />
      <rect x={newelX - 17} y="440" width="34" height="20" fill="#6b3418" {...line} />
    </g>
  );
}

export default function StairsArt({ pokes }: { pokes: Pokes }) {
  const bonks = pokes['Climb the stairs'] ?? 0;
  return (
    <>
      <defs>
        <pattern id="stairs-paper" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="#2f4a3a" />
          <rect x="14" width="2" height="30" fill="#b8873a" opacity="0.45" />
          <circle cx="15" cy="15" r="3" fill="#b8873a" opacity="0.35" />
        </pattern>
        <filter id="stairs-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <radialGradient id="stairs-light" cx="50%" cy="45%" r="70%">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.12" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>

      <g filter="url(#stairs-ink)">
        {/* Wall and floor (the floor isn't level) */}
        <rect width="600" height="480" fill="url(#stairs-paper)" />
        <polygon points="0,458 600,466 600,480 0,480" fill="#5b3a1e" {...line} />

        {/* Archway, with steps going down into the dark (to the foyer) */}
        <path d="M22 462 L22 338 Q80 282 138 338 L138 462 Z" fill="#6b4a2a" {...line} />
        <path
          d="M32 462 L32 342 Q80 296 128 342 L128 462 Z"
          fill="#0b0604"
          {...line}
          strokeWidth={2}
        />
        {[
          [440, 38, 122],
          [420, 46, 114],
          [404, 54, 106],
          [392, 60, 100],
          [383, 65, 95],
        ].map(([y, x1, x2], i) => (
          <polygon
            key={y}
            points={`${x1},${y} ${x2},${y} ${x2 - 3},${y - 8} ${x1 + 3},${y - 8}`}
            fill="#3a2414"
            opacity={1 - i * 0.18}
          />
        ))}

        {/* Portrait of the builder, a little crooked */}
        <g transform="rotate(3 535 220)">
          <path
            d="M535 140 L502 160 M535 140 L568 160"
            stroke={INK}
            strokeWidth="1.5"
            fill="none"
          />
          <rect x="495" y="158" width="80" height="112" fill="#c9973f" {...line} />
          <rect x="503" y="166" width="64" height="96" fill="#20352a" {...thin} />
          <path d="M515 262 L520 222 Q535 212 550 222 L555 262 Z" fill="#141414" />
          <circle cx="535" cy="204" r="13" fill="#e8c9a0" {...thin} />
          <circle cx="535" cy="189" r="7" fill="#5a3a22" />
          <circle cx="531" cy="203" r="1.5" fill={INK} />
          <circle cx="539" cy="203" r="1.5" fill={INK} />
          <path d="M531 210 L539 210" stroke={INK} strokeWidth="1.2" />
          {/* A hammer, and a roll of plans */}
          <line x1="556" y1="236" x2="561" y2="212" stroke="#7a5230" strokeWidth="3" />
          <rect x="554" y="206" width="14" height="6" fill="#888" {...thin} />
          <rect
            x="508"
            y="232"
            width="16"
            height="7"
            fill="#e9dcc0"
            {...thin}
            transform="rotate(-20 516 235)"
          />
        </g>

        {/* Potted fern */}
        <path d="M512 462 L506 420 L566 420 L560 462 Z" fill="#8a4a2a" {...line} />
        {[
          'M536 420 Q520 380 494 372',
          'M536 420 Q530 370 516 344',
          'M536 420 Q540 368 556 346',
          'M536 420 Q556 382 584 378',
          'M536 420 Q536 386 538 360',
        ].map((d) => (
          <path key={d} d={d} fill="none" stroke="#3f7a3a" strokeWidth="7" strokeLinecap="round" />
        ))}

        {/* The staircase, bottom step first */}
        {STEPS.map(({ yb, w }, i) => {
          const top = yb - RISER;
          const run = w * 0.46;
          return (
            <g key={i}>
              <polygon
                points={`${CX - w},${top} ${CX + w},${top} ${CX + w - 6},${top - TREAD} ${CX - w + 6},${top - TREAD}`}
                fill="#8a5a32"
                {...line}
                strokeWidth={2}
              />
              <rect
                x={CX - w}
                y={top}
                width={w * 2}
                height={RISER}
                fill="#5b3418"
                {...line}
                strokeWidth={2}
              />
              {/* Red runner, and a brass rod */}
              <polygon
                points={`${CX - run},${top} ${CX + run},${top} ${CX + run - 3},${top - TREAD} ${CX - run + 3},${top - TREAD}`}
                fill="#a52a2a"
              />
              <rect x={CX - run} y={top} width={run * 2} height={RISER} fill="#8b1e1e" />
              <line
                x1={CX - run - 4}
                y1={top + 2}
                x2={CX + run + 4}
                y2={top + 2}
                stroke="#e0b450"
                strokeWidth="3"
              />
              <line
                x1={CX - run + 6}
                y1={top + RISER - 6}
                x2={CX + run - 6}
                y2={top + RISER - 6}
                stroke="#d9b24a"
                strokeWidth="1.5"
                opacity="0.6"
              />
            </g>
          );
        })}
        <Banister side={-1} />
        <Banister side={1} />

        {/* Ceiling: beams, the trapdoor to the attic, and the cord */}
        <rect width="600" height={CEILING} fill="#2a1a10" />
        {[75, 150, 225, 375, 450, 525].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2={CEILING} stroke="#3e2818" strokeWidth="10" />
        ))}
        <line
          x1="0"
          y1={CEILING}
          x2="600"
          y2={CEILING}
          {...line}
          strokeWidth={6}
          stroke="#4a2f1b"
        />
        <line x1="0" y1={CEILING + 4} x2="600" y2={CEILING + 4} stroke={INK} strokeWidth="2" />
        <polygon points="74,52 150,52 154,96 70,96" fill="#5b3a1e" {...line} />
        <polygon points="82,58 142,58 145,90 79,90" fill="#120a05" {...line} strokeWidth={2} />
      </g>

      {/* Moving parts */}
      <g className="stairs-cord">
        <line x1="112" y1="90" x2="112" y2="214" stroke="#d8c8a0" strokeWidth="2.5" />
        <path d="M106 214 L118 214 L121 232 L103 232 Z" fill="#a52a2a" {...thin} />
      </g>

      {CRACKS.slice(0, bonks).map((d) => (
        <path key={d} d={d} fill="none" stroke="#0a0503" strokeWidth="2.5" strokeLinejoin="round" />
      ))}

      {bonks >= 2 && (
        <g className="stairs-sign">
          <line x1="276" y1={CEILING + 4} x2="268" y2="176" stroke="#b9b9b9" strokeWidth="1.5" />
          <line x1="364" y1={CEILING + 4} x2="372" y2="176" stroke="#b9b9b9" strokeWidth="1.5" />
          <rect x="252" y="174" width="136" height="26" fill="#f2e6c4" {...line} strokeWidth={2} />
          <text
            x="320"
            y="191"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="12.5"
            fontWeight="bold"
            fill="#8b1e1e"
          >
            MIND YOUR HEAD
          </text>
        </g>
      )}

      {bonks > 0 && (
        <g key={bonks} className="stairs-bonk">
          <polygon
            points="320,92 332,110 352,100 344,120 368,128 344,136 352,156 330,146 320,166 310,146 288,156 296,136 272,128 296,120 288,100 308,110"
            fill="#ffe14d"
            {...line}
          />
          <text
            x="320"
            y="133"
            textAnchor="middle"
            fontFamily="Impact, 'Arial Black', sans-serif"
            fontSize="15"
            fill="#c0392b"
          >
            BONK!
          </text>
        </g>
      )}

      <rect width="600" height="480" fill="url(#stairs-light)" pointerEvents="none" />
    </>
  );
}
