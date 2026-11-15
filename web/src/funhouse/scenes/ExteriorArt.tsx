import apfHead from '../../assets/cubes/apf-head-space.png';
import type { Pokes } from './types';

/*
 * The funhouse from outside, at night: a crooked house that someone has been
 * building onto for a very long time and never stopped. Its windows are the
 * rooms inside: the attic's round window, the parlor's fire, the mirrors' glint,
 * the chandelier in the foyer, eyes in the closet, the arcade's neon in a
 * lean-to, a long low hallway wing whose windows get smaller, a 1998 blue window
 * up the turret. An outside staircase climbs into the turret wall.
 *
 * Out front: the door, a cellar hatch, a lantern, a mailbox, the warning sign,
 * and a signpost back home.
 *
 * The art reacts to pokes: the mailbox flag goes up, the lantern goes out (and
 * comes back on by itself), and somebody peeks around the upstairs curtain.
 *
 * Drawing units: 600 × 480.
 */

const INK = '#07060f';
const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const thin = { stroke: INK, strokeWidth: 1.5 } as const;
const WALL = '#3b2f4a';
const ROOF = '#1f1830';
const TRIM = '#8a7a9a';

/** A window frame with a cross bar, filled with whatever is inside. */
function Window({
  x,
  y,
  w,
  h,
  fill,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}) {
  return (
    <g>
      <rect
        x={x - 4}
        y={y - 4}
        width={w + 8}
        height={h + 8}
        fill={TRIM}
        {...line}
        strokeWidth={2}
      />
      <rect x={x} y={y} width={w} height={h} fill={fill} {...thin} />
    </g>
  );
}
const bars = (x: number, y: number, w: number, h: number) => (
  <g stroke={INK} strokeWidth="2.5">
    <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} />
    <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} />
  </g>
);

/** The long hallway wing's windows, smaller and smaller toward the far end. */
const HALL_WINDOWS = [
  { x: 136, s: 1 },
  { x: 108, s: 0.82 },
  { x: 85, s: 0.66 },
  { x: 66, s: 0.52 },
  { x: 51, s: 0.4 },
  { x: 40, s: 0.3 },
];

export default function ExteriorArt({ pokes }: { pokes: Pokes }) {
  const mail = pokes.mailbox ?? 0;
  const lantern = pokes.lantern ?? 0;
  const peeks = pokes.curtain ?? 0;
  return (
    <>
      <defs>
        <linearGradient id="ext-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0820" />
          <stop offset="0.7" stopColor="#2a1a4a" />
          <stop offset="1" stopColor="#4a2a5a" />
        </linearGradient>
        <radialGradient id="ext-moon-glow">
          <stop offset="0" stopColor="#fff6d0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff6d0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ext-warm">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ext-fire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a2a10" />
          <stop offset="1" stopColor="#ff8a2a" />
        </linearGradient>
        <linearGradient id="ext-mirror" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8eef4" />
          <stop offset="0.5" stopColor="#6f9fae" />
          <stop offset="1" stopColor="#bfe6f0" />
        </linearGradient>
        <pattern id="ext-siding" width="40" height="10" patternUnits="userSpaceOnUse">
          <rect width="40" height="10" fill={WALL} />
          <line x1="0" y1="9.5" x2="40" y2="9.5" stroke="#2a2138" strokeWidth="1.5" />
        </pattern>
        <pattern id="ext-shingles" width="16" height="10" patternUnits="userSpaceOnUse">
          <rect width="16" height="10" fill={ROOF} />
          <path d="M0 10 Q4 4 8 10 Q12 4 16 10" fill="none" stroke="#2f2648" strokeWidth="1.5" />
        </pattern>
        <clipPath id="ext-curtain-window">
          <rect x="372" y="222" width="46" height="46" />
        </clipPath>
        <filter id="ext-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="23" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <radialGradient id="ext-dark" cx="50%" cy="55%" r="75%">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>

      {/* Sky, stars, moon */}
      <rect width="600" height="480" fill="url(#ext-sky)" />
      {[
        [40, 30],
        [130, 60],
        [220, 24],
        [330, 44],
        [520, 30],
        [560, 90],
        [480, 120],
        [250, 80],
        [580, 180],
        [20, 150],
        [160, 120],
      ].map(([x, y], i) => (
        <circle
          key={`${x}${y}`}
          className={i % 3 === 0 ? 'ext-star' : undefined}
          style={{ animationDelay: `${-i * 0.7}s` }}
          cx={x}
          cy={y}
          r={i % 2 ? 1.2 : 1.8}
          fill="#fff6d0"
        />
      ))}
      <circle cx="84" cy="78" r="60" fill="url(#ext-moon-glow)" />
      <path d="M84 52 A26 26 0 1 0 108 92 A20 20 0 1 1 84 52 Z" fill="#fff6d0" />

      <g filter="url(#ext-ink)">
        {/* The hill, and the path up to the door */}
        <path d="M0 404 Q150 384 300 396 T600 392 L600 480 L0 480 Z" fill="#1a2a1e" {...line} />
        <polygon
          points="280,404 320,404 360,480 240,480"
          fill="#4a3f3a"
          {...line}
          strokeWidth={2}
        />

        {/* The hallway wing, long and low, and longer inside */}
        <polygon points="24,312 166,300 166,404 24,404" fill="url(#ext-siding)" {...line} />
        <polygon points="18,314 166,292 166,302 22,320" fill={ROOF} {...line} strokeWidth={2} />
        {HALL_WINDOWS.map(({ x, s }) => (
          <Window key={x} x={x} y={340 - 14 * s} w={16 * s} h={26 * s} fill="#6a3aaa" />
        ))}

        {/* The arcade's lean-to */}
        <polygon points="436,300 572,320 572,404 436,404" fill="url(#ext-siding)" {...line} />
        <polygon points="430,288 580,314 576,324 432,300" fill={ROOF} {...line} strokeWidth={2} />
        <rect x="462" y="336" width="80" height="44" fill="#120a24" {...line} strokeWidth={2} />

        {/* The outside staircase, climbing into the turret wall */}
        <path
          d="M566 318 L566 306 L552 306 L552 292 L538 292 L538 278 L524 278 L524 264 L510 264 L510 250 L496 250 L496 236 L482 236 L482 222 L468 222 L468 208 L452 208 L452 222 L556 330 Z"
          fill="#5a4a3a"
          {...line}
          strokeWidth={2}
        />
        <polyline
          points="572,286 474,186 456,186"
          fill="none"
          stroke={TRIM}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {[560, 532, 504, 476].map((x) => (
          <line
            key={x}
            x1={x}
            y1={x - 248}
            x2={x}
            y2={x - 274 + (x - 476) * 0.03}
            stroke={TRIM}
            strokeWidth="2"
          />
        ))}

        {/* The turret, leaning */}
        <g transform="rotate(4 422 214)">
          <rect x="400" y="84" width="46" height="132" fill="url(#ext-siding)" {...line} />
          <polygon points="394,88 452,88 426,14" fill="url(#ext-shingles)" {...line} />
          <line x1="426" y1="14" x2="426" y2="2" stroke={TRIM} strokeWidth="2" />
          <Window x={414} y={110} w={18} h={26} fill="#1a2ad0" />
        </g>

        {/* The chimney, not quite straight */}
        <g transform="rotate(-6 206 150)">
          <rect x="194" y="112" width="26" height="62" fill="#5a2a22" {...line} />
          <rect x="190" y="106" width="34" height="10" fill="#4a221c" {...line} strokeWidth={2} />
        </g>

        {/* The main house */}
        <polygon points="160,214 440,208 440,404 160,404" fill="url(#ext-siding)" {...line} />
        <polygon points="146,220 300,92 454,212" fill="url(#ext-shingles)" {...line} />
        <polygon points="140,222 460,214 460,224 140,232" fill={ROOF} {...line} strokeWidth={2} />

        {/* The attic's round window */}
        <circle cx="300" cy="162" r="23" fill={TRIM} {...line} strokeWidth={2} />
        <circle cx="300" cy="162" r="18" fill="#3a2a10" {...thin} />
        <circle cx="300" cy="162" r="18" fill="url(#ext-warm)" />
        <path d="M282 162 H318 M300 144 V180" stroke={INK} strokeWidth="2" />

        {/* Upstairs: the mirrors (left), the foyer's chandelier (middle), the curtain (right) */}
        <Window x={180} y={232} w={46} h={46} fill="url(#ext-mirror)" />
        <Window x={276} y={234} w={48} h={42} fill="#6a1a20" />
        <circle cx="300" cy="252" r="22" fill="url(#ext-warm)" />
        <path
          d="M288 254 Q300 262 312 254 M300 236 V250"
          stroke="#d4a64a"
          strokeWidth="2"
          fill="none"
        />
        {[288, 300, 312].map((x) => (
          <circle key={x} cx={x} cy="250" r="1.6" fill="#ffe27a" />
        ))}
        <Window x={372} y={222} w={46} h={46} fill="#2a1a10" />

        {/* Downstairs: the parlor's fire (left), the closet (right, small) */}
        <Window x={178} y={302} w={50} h={48} fill="url(#ext-fire)" />
        <Window x={404} y={306} w={24} h={30} fill="#050505" />

        {/* The porch: steps, posts, a little roof, the door */}
        <polygon points="250,300 350,300 364,312 236,312" fill={ROOF} {...line} strokeWidth={2} />
        <rect x="244" y="312" width="8" height="92" fill={TRIM} {...thin} />
        <rect x="348" y="312" width="8" height="92" fill={TRIM} {...thin} />
        <rect x="270" y="318" width="60" height="86" fill="#5b2a18" {...line} />
        <rect x="278" y="328" width="44" height="30" fill="none" stroke="#3a1a0c" strokeWidth="2" />
        <rect x="278" y="366" width="44" height="30" fill="none" stroke="#3a1a0c" strokeWidth="2" />
        <circle cx="320" cy="364" r="3.5" fill="#d4a64a" {...thin} />
        <rect x="256" y="404" width="88" height="7" fill="#5a4a3a" {...thin} />
        <rect x="264" y="411" width="72" height="7" fill="#5a4a3a" {...thin} />

        {/* The cellar hatch, for coming in quietly */}
        <polygon
          points="178,404 244,404 236,382 186,382"
          fill="#4a3a28"
          {...line}
          strokeWidth={2}
        />
        <line x1="211" y1="382" x2="211" y2="404" stroke={INK} strokeWidth="2" />
        <circle cx="205" cy="394" r="2.5" fill="#8a8f98" />
        <circle cx="217" cy="394" r="2.5" fill="#8a8f98" />

        {/* The signpost home */}
        <rect x="64" y="414" width="7" height="58" fill="#5a3a22" {...thin} />
        <polygon
          points="26,416 106,416 106,438 26,438 16,427"
          fill="#c9b48a"
          {...line}
          strokeWidth={2}
        />
        <text
          x="64"
          y="432"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="13"
          fontWeight="bold"
          fill="#3a2410"
        >
          HOME
        </text>

        {/* The warning sign, staked in the lawn */}
        <line x1="470" y1="460" x2="470" y2="476" stroke="#5a3a22" strokeWidth="5" />
        <line x1="560" y1="460" x2="560" y2="476" stroke="#5a3a22" strokeWidth="5" />
        <g transform="rotate(-3 515 432)">
          <rect x="446" y="408" width="140" height="56" fill="#e8dcc0" {...line} strokeWidth={2} />
          {[
            'old websites, not all well',
            'doors that lie',
            'things that jump out',
            'sounds (if you let them)',
          ].map((t, i) => (
            <text
              key={t}
              x="454"
              y={421 + i * 12}
              fontFamily="'Comic Sans MS', 'Comic Neue', cursive"
              fontSize="10"
              fill="#8b1e1e"
            >
              {`• ${t}`}
            </text>
          ))}
        </g>

        {/* The mailbox */}
        <rect x="402" y="434" width="5" height="38" fill="#5a3a22" {...thin} />
        <path
          d="M386 416 L386 438 L424 438 L424 416 Q405 402 386 416 Z"
          fill="#2a4a6a"
          {...line}
          strokeWidth={2}
        />
      </g>

      {/* Moving parts */}
      <g className="ext-smoke">
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="ext-puff"
            style={{ animationDelay: `${-i * 1.3}s` }}
            cx="210"
            cy="100"
            r="9"
            fill="#8a849a"
          />
        ))}
      </g>
      <rect
        className="ext-cloud"
        x="-120"
        y="52"
        width="110"
        height="16"
        rx="8"
        fill="#3a2f5a"
        opacity="0.7"
      />

      {/* The parlor's fire */}
      <path
        className="parlor-fire"
        d="M190 350 Q194 330 200 340 Q204 320 210 336 Q216 324 218 350 Z"
        fill="#ffcf4d"
      />
      {bars(178, 302, 50, 48)}
      {/* A glint across the mirrors' window */}
      <rect
        className="ext-glint"
        x="180"
        y="232"
        width="10"
        height="46"
        fill="#fff"
        opacity="0.7"
      />
      {bars(180, 232, 46, 46)}
      {/* The arcade's neon, and OPEN */}
      <rect className="ext-neon" x="462" y="336" width="80" height="44" opacity="0.55" />
      <text
        className="ext-open"
        x="502"
        y="364"
        textAnchor="middle"
        fontFamily="Impact, 'Arial Black', sans-serif"
        fontSize="14"
        fill="#ff4ad0"
      >
        OPEN
      </text>
      {/* Eyes in the closet */}
      <g className="closet-eyes">
        <circle cx="411" cy="320" r="2" fill="#ffe14d" />
        <circle cx="420" cy="320" r="2" fill="#ffe14d" />
      </g>
      {/* 1998, up the turret */}
      <g transform="rotate(4 422 214)">
        <rect className="hallway-new" x="414" y="120" width="18" height="6" fill="#ffe600" />
      </g>

      {/* The upstairs curtain, and whoever is behind it */}
      <g clipPath="url(#ext-curtain-window)">
        {peeks > 0 && (
          <image
            key={`apf${peeks}`}
            className="ext-peek"
            href={apfHead}
            x="392"
            y="226"
            width="34"
            height="34"
          />
        )}
        <path
          key={`curtain${peeks}`}
          className={peeks ? 'ext-curtain ext-curtain-twitch' : 'ext-curtain'}
          d="M372 222 L418 222 L418 268 Q404 250 410 268 L372 268 Z"
          fill="#7a1a2a"
        />
      </g>
      {bars(372, 222, 46, 46)}

      {/* The lantern on the porch post */}
      <line x1="356" y1="326" x2="366" y2="326" stroke={INK} strokeWidth="2" />
      <rect x="362" y="326" width="12" height="18" fill="#2a2a2a" stroke={INK} strokeWidth="1.5" />
      <g
        key={`lantern${lantern}`}
        className={lantern ? 'ext-lantern ext-lantern-out' : 'ext-lantern'}
      >
        <circle cx="368" cy="335" r="30" fill="url(#ext-warm)" />
        <rect x="364" y="329" width="4" height="12" fill="#ffe27a" />
        <rect x="369" y="329" width="3" height="12" fill="#ffe27a" />
        <circle className="ext-moth" cx="368" cy="335" r="1.6" fill="#e8dcc0" />
      </g>

      {/* The mailbox flag */}
      <rect
        className={mail ? 'ext-flag ext-flag-up' : 'ext-flag'}
        x="424"
        y="420"
        width="4"
        height="18"
        fill="#d42a2a"
        stroke={INK}
        strokeWidth="1"
      />

      <rect width="600" height="480" fill="url(#ext-dark)" pointerEvents="none" />
    </>
  );
}
