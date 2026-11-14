import type { Pokes } from './types';

/*
 * A Closet, seen from its doorway: coats on a rail, a hat shelf (hat box,
 * shoebox, a cheesehead), mothballs on the floor, a bare bulb on a pull
 * chain, and, between the coats, a door in the back that shouldn't be there.
 *
 * It reacts to pokes (see closet.ts): the coats sway, a mothball rolls, and
 * the chain switches the light. In the dark, light leaks around the back
 * door and something in the coats blinks.
 *
 * Drawing units: 600 × 480. Still things sit inside the "ink" filter
 * (wobbly outlines); moving ones get it separately or go without.
 */

const INK = '#1a0d08';
const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const thin = { stroke: INK, strokeWidth: 1.5 } as const;

const RAIL_Y = 132;

interface Coat {
  cx: number;
  hem: number;
  fill: string;
  /** Plaid lines or sequins, drawn inside the coat's outline. */
  pattern?: 'plaid' | 'sequins';
}

const COATS: Coat[] = [
  { cx: 165, hem: 348, fill: '#7a5230' },
  { cx: 225, hem: 322, fill: '#8b2f2f', pattern: 'plaid' },
  { cx: 375, hem: 330, fill: '#2f5a3f' },
  { cx: 435, hem: 340, fill: '#5b3a78', pattern: 'sequins' },
];

const coatPath = ({ cx, hem }: Coat) =>
  `M${cx - 14} 138 L${cx - 36} 152 L${cx - 42} ${hem} L${cx + 42} ${hem} ` +
  `L${cx + 36} 152 L${cx + 14} 138 L${cx} 152 Z`;

function CoatShape({ coat, i }: { coat: Coat; i: number }) {
  const { cx, hem, fill, pattern } = coat;
  const clip = `closet-coat-${i}`;
  return (
    <g
      className="closet-coat"
      style={{ transformOrigin: `${cx}px ${RAIL_Y}px`, animationDelay: `${i * 0.12}s` }}
    >
      <clipPath id={clip}>
        <path d={coatPath(coat)} />
      </clipPath>
      {/* Hook and hanger */}
      <path
        d={`M${cx} ${RAIL_Y + 2} C${cx} ${RAIL_Y - 10} ${cx + 9} ${RAIL_Y - 12} ${cx + 9} ${RAIL_Y - 5}`}
        fill="none"
        stroke="#c8c8c8"
        strokeWidth="2.5"
      />
      <path
        d={`M${cx - 30} 148 L${cx} 134 L${cx + 30} 148`}
        fill="none"
        stroke="#c8c8c8"
        strokeWidth="2.5"
      />
      <path d={coatPath(coat)} fill={fill} {...line} />
      <g clipPath={`url(#${clip})`}>
        {pattern === 'plaid' &&
          [180, 220, 260, 300].map((y) => (
            <line
              key={y}
              x1={cx - 50}
              y1={y}
              x2={cx + 50}
              y2={y}
              stroke="#d9b24a"
              strokeWidth="3"
              opacity="0.5"
            />
          ))}
        {pattern === 'plaid' &&
          [-22, 0, 22].map((dx) => (
            <line
              key={dx}
              x1={cx + dx}
              y1={140}
              x2={cx + dx}
              y2={hem}
              stroke="#1f1f1f"
              strokeWidth="4"
              opacity="0.35"
            />
          ))}
        {pattern === 'sequins' &&
          Array.from({ length: 48 }, (_, k) => (
            <circle
              key={k}
              cx={cx - 38 + (k % 6) * 15 + (Math.floor(k / 6) % 2) * 7}
              cy={160 + Math.floor(k / 6) * 23}
              r="2"
              fill="#e8d4ff"
              opacity="0.75"
            />
          ))}
      </g>
      {/* Lapels, sleeves, buttons */}
      <path
        d={`M${cx - 14} 138 L${cx - 4} 178 L${cx} 152 L${cx + 4} 178 L${cx + 14} 138`}
        fill="none"
        {...line}
        strokeWidth={2}
      />
      <path
        d={`M${cx - 34} 160 L${cx - 30} ${hem - 40} M${cx + 34} 160 L${cx + 30} ${hem - 40}`}
        fill="none"
        stroke={INK}
        strokeWidth="2"
        opacity="0.6"
      />
      {[196, 226, 256].map((y) => (
        <circle key={y} cx={cx + 3} cy={y} r="3" fill="#d8c8a0" {...thin} />
      ))}
    </g>
  );
}

const MOTHBALLS: [number, number][] = [
  [182, 440],
  [196, 449],
  [210, 438],
  [388, 452],
  [402, 444],
  [418, 456],
];

export default function ClosetArt({ pokes }: { pokes: Pokes }) {
  const lightOn = (pokes.light ?? 0) % 2 === 0;
  return (
    <>
      <defs>
        <pattern id="closet-paper" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#5c5346" />
          <rect x="12" width="12" height="24" fill="#554c40" />
        </pattern>
        <filter id="closet-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <radialGradient id="closet-bulb" cx="300" cy="40" r="330" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff2b0" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <filter id="closet-glow">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <g filter="url(#closet-ink)">
        {/* The closet: ceiling, side walls, back wall, floor */}
        <rect width="600" height="480" fill="#120c08" />
        <polygon points="0,0 600,0 470,40 130,40" fill="#2b231c" {...line} />
        <polygon points="130,40 470,40 470,400 130,400" fill="url(#closet-paper)" {...line} />
        <polygon points="0,0 130,40 130,400 0,480" fill="#463e33" {...line} />
        <polygon points="600,0 470,40 470,400 600,480" fill="#463e33" {...line} />
        <polygon points="130,400 470,400 600,480 0,480" fill="#3a2a1c" {...line} />
        {[
          [200, 140],
          [270, 245],
          [330, 355],
          [400, 460],
        ].map(([x1, x2]) => (
          <line key={x1} x1={x1} y1="400" x2={x2} y2="480" stroke="#2a1c10" strokeWidth="2" />
        ))}

        {/* The door in the back (a little too tall, a little crooked) */}
        <rect x="258" y="160" width="84" height="241" fill="#2a1a0e" {...line} />
        <polygon
          points="266,168 334,166 334,400 266,400"
          fill="#4a2f1b"
          {...line}
          strokeWidth={2}
        />
        <rect x="276" y="182" width="48" height="80" fill="none" stroke="#2f1d10" strokeWidth="2" />
        <rect x="276" y="282" width="48" height="96" fill="none" stroke="#2f1d10" strokeWidth="2" />
        <circle cx="326" cy="290" r="3.5" fill="#c9973f" {...thin} />
        <line x1="268" y1="399" x2="332" y2="399" stroke="#ffd166" strokeWidth="3" />

        {/* Hat shelf: a hat box, a shoebox, a cheesehead */}
        <polygon points="130,100 470,100 508,112 92,112" fill="#8a6a48" {...line} />
        <rect x="92" y="112" width="416" height="10" fill="#6b4a2a" {...line} />
        <rect x="138" y="68" width="60" height="32" fill="#a8434a" {...line} />
        <ellipse cx="168" cy="68" rx="30" ry="6" fill="#c25560" {...line} />
        <line x1="138" y1="86" x2="198" y2="86" stroke="#e8c96a" strokeWidth="3" />
        <rect x="214" y="78" width="66" height="22" fill="#b49a6a" {...line} />
        <line x1="214" y1="85" x2="280" y2="85" stroke={INK} strokeWidth="1.5" />
        <polygon points="350,100 432,100 432,62" fill="#f2c230" {...line} />
        <ellipse cx="404" cy="92" rx="6" ry="4" fill="#d29a12" />
        <ellipse cx="420" cy="80" rx="4" ry="3" fill="#d29a12" />
        <ellipse cx="386" cy="96" rx="3.5" ry="2.5" fill="#d29a12" />

        {/* Rail */}
        <line
          x1="104"
          y1={RAIL_Y}
          x2="496"
          y2={RAIL_Y}
          stroke="#9a9a9a"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line x1="104" y1={RAIL_Y} x2="104" y2="122" stroke="#9a9a9a" strokeWidth="4" />
        <line x1="496" y1={RAIL_Y} x2="496" y2="122" stroke="#9a9a9a" strokeWidth="4" />

        {/* A pair of galoshes under the brown coat */}
        <path
          d="M140 372 L140 404 L170 404 L170 396 L152 394 L152 372 Z"
          fill="#c9a227"
          {...line}
          strokeWidth={2}
        />
        <path
          d="M160 374 L160 410 L190 410 L190 402 L172 400 L172 374 Z"
          fill="#d9b23a"
          {...line}
          strokeWidth={2}
        />
      </g>

      {/* Coats (sway when pushed: a new key restarts the animation) */}
      <g key={`coats-${pokes.coats ?? 0}`} filter="url(#closet-ink)">
        {COATS.map((c, i) => (
          <CoatShape key={c.cx} coat={c} i={i} />
        ))}
      </g>

      {/* Mothballs (one rolls off when poked) */}
      <g>
        {MOTHBALLS.map(([x, y], i) => (
          <circle
            key={`${i}-${i === 2 ? (pokes.mothballs ?? 0) : 0}`}
            className={i === 2 && pokes.mothballs ? 'closet-mothball-roll' : undefined}
            cx={x}
            cy={y}
            r="5.5"
            fill="#f4f1e8"
            {...thin}
          />
        ))}
      </g>

      {/* Bulb and pull chain (swings when pulled) */}
      <line x1="300" y1="0" x2="300" y2="22" stroke={INK} strokeWidth="2" />
      <rect x="293" y="18" width="14" height="10" fill="#777" {...thin} />
      <circle cx="300" cy="38" r="10" fill={lightOn ? '#fff6c8' : '#6d6a60'} {...thin} />
      <g key={`chain-${pokes.light ?? 0}`} className="closet-chain">
        <line
          x1="303"
          y1="30"
          x2="303"
          y2="92"
          stroke="#b9b9b9"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        <circle cx="303" cy="95" r="3.5" fill="#d8c8a0" {...thin} />
      </g>

      {lightOn ? (
        <rect width="600" height="480" fill="url(#closet-bulb)" pointerEvents="none" />
      ) : (
        <g pointerEvents="none">
          <rect width="600" height="480" fill="#000" opacity="0.88" />
          {/* Light from whatever is behind the back door */}
          <rect
            x="264"
            y="164"
            width="72"
            height="238"
            fill="none"
            stroke="#ffcc66"
            strokeWidth="3"
            filter="url(#closet-glow)"
          />
          <rect
            x="264"
            y="164"
            width="72"
            height="238"
            fill="none"
            stroke="#ffd98a"
            strokeWidth="1"
          />
          <polygon points="266,401 334,401 380,470 220,470" fill="#ffcc66" opacity="0.18" />
          {/* Something in the coats */}
          <g className="closet-eyes">
            <ellipse cx="204" cy="206" rx="4.5" ry="3" fill="#fff07a" />
            <ellipse cx="222" cy="204" rx="4.5" ry="3" fill="#fff07a" />
          </g>
        </g>
      )}
    </>
  );
}
