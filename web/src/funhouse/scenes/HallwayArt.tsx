import type { Pokes } from './types';

/*
 * The Hallway That Keeps Going: a long corridor in one-point perspective,
 * doors down both walls, lamps hanging down the middle, a runner running away.
 * Door 1 glows red from the foyer, Door 2 is a mirror, light and colors leak
 * around Door 3, Door 7 is very 1998, and Door 13 is at the far end, a crack of
 * green under it.
 *
 * The art reacts to pokes: walking the runner makes the hallway longer (more
 * doors appear and the far end shrinks away); tapping the near lamp puts the
 * lights out one by one toward you; trying Door 4 sets off a modem behind it.
 *
 * Drawing units: 600 × 480.
 */

const INK = '#0d0718';
const GOLD = '#c9973f';
const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const thin = { stroke: INK, strokeWidth: 1.5 } as const;

/** Everything recedes toward this point. A thing at depth s is drawn at scale s. */
const VP = { x: 300, y: 220 };
const wallX = (side: -1 | 1, s: number) => VP.x + side * 300 * s;
const ceilY = (s: number) => VP.y - 220 * s;
const floorY = (s: number) => VP.y + 260 * s;
const doorTop = (s: number) => VP.y - 120 * s;

/** A door on a wall, from depth a (near edge) to b (far edge). */
function doorPoints(side: -1 | 1, a: number, b: number) {
  return `${wallX(side, a)},${doorTop(a)} ${wallX(side, b)},${doorTop(b)} ${wallX(side, b)},${floorY(b)} ${wallX(side, a)},${floorY(a)}`;
}

interface WallDoor {
  n: number;
  side: -1 | 1;
  a: number;
  b: number;
  fill: string;
}

/** The doors with somewhere to go (and Door 4), near to far. */
const DOORS: WallDoor[] = [
  { n: 1, side: -1, a: 0.92, b: 0.68, fill: '#5b3418' },
  { n: 2, side: 1, a: 0.92, b: 0.68, fill: 'url(#hallway-mirror)' },
  { n: 3, side: -1, a: 0.5, b: 0.4, fill: '#4a2a12' },
  { n: 4, side: 1, a: 0.5, b: 0.4, fill: '#5b3418' },
  { n: 5, side: -1, a: 0.37, b: 0.32, fill: '#4a2a12' },
  { n: 6, side: 1, a: 0.37, b: 0.32, fill: '#4a2a12' },
  { n: 7, side: -1, a: 0.29, b: 0.25, fill: '#1a2ad0' },
  { n: 8, side: 1, a: 0.29, b: 0.25, fill: '#4a2a12' },
];

/** How far away the end of the hall is, after walking the runner `walks` times. */
const endDepth = (walks: number) => 0.13 / (1 + 0.45 * Math.min(walks, 4));

/** The little unnumbered doors between Door 8 and the end, more of them the longer the hall. */
function farDoors(end: number) {
  const doors: [number, number][] = [];
  for (let a = 0.22; a * 0.86 > end + 0.008; a *= 0.78) doors.push([a, a * 0.86]);
  return doors;
}

function farLamps(end: number) {
  const lamps: number[] = [];
  for (let s = 0.82; s > end + 0.01; s *= 0.62) lamps.push(s);
  return lamps;
}

function Plaque({ d }: { d: WallDoor }) {
  const s = (d.a + d.b) / 2;
  const x = wallX(d.side, s);
  const size = Math.max(9, 15 * s);
  return (
    <text
      x={x}
      y={doorTop(s) + size * 1.6}
      textAnchor="middle"
      fontFamily="Georgia, serif"
      fontSize={size}
      fontWeight="bold"
      fill={GOLD}
      transform={`skewY(${d.side * -20} )`}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {d.n}
    </text>
  );
}

export default function HallwayArt({ pokes }: { pokes: Pokes }) {
  const walks = pokes.runner ?? 0;
  const end = endDepth(walks);
  const lampTaps = pokes.lamp ?? 0;
  const modem = pokes['Door 4'] ?? 0;
  const lamps = farLamps(end);

  return (
    <>
      <defs>
        <pattern id="hallway-paper" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="#2f1a52" />
          <rect x="10" width="2" height="22" fill="#5a3a8a" opacity="0.6" />
          <circle cx="11" cy="11" r="2" fill={GOLD} opacity="0.35" />
        </pattern>
        <linearGradient id="hallway-mirror" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dfeff4" />
          <stop offset="0.45" stopColor="#9fbcc8" />
          <stop offset="0.55" stopColor="#f4fbfd" />
          <stop offset="1" stopColor="#7d9eab" />
        </linearGradient>
        <radialGradient id="hallway-lamp-glow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <filter id="hallway-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="13" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <radialGradient id="hallway-dark" cx="50%" cy="46%" r="70%">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
      </defs>

      <g filter="url(#hallway-ink)">
        {/* Walls, ceiling, floor, and the end of the hall */}
        <rect width="600" height="480" fill="url(#hallway-paper)" />
        <polygon
          points={`0,0 600,0 ${wallX(1, end)},${ceilY(end)} ${wallX(-1, end)},${ceilY(end)}`}
          fill="#1a0e30"
          {...line}
        />
        <polygon
          points={`0,480 600,480 ${wallX(1, end)},${floorY(end)} ${wallX(-1, end)},${floorY(end)}`}
          fill="#4a2c16"
          {...line}
        />
        {/* Floorboards */}
        {[-260, -170, -90, -30, 30, 90, 170, 260].map((dx) => (
          <line
            key={dx}
            x1={VP.x + dx * 1.6}
            y1="480"
            x2={VP.x + dx * end}
            y2={floorY(end)}
            stroke="#2e1a0c"
            strokeWidth="1.5"
          />
        ))}
        {/* Runner, with a gold border */}
        <polygon
          points={`${VP.x - 92},480 ${VP.x + 92},480 ${VP.x + 92 * end * 1.85},${floorY(end)} ${VP.x - 92 * end * 1.85},${floorY(end)}`}
          fill={GOLD}
        />
        <polygon
          points={`${VP.x - 80},480 ${VP.x + 80},480 ${VP.x + 80 * end * 1.85},${floorY(end)} ${VP.x - 80 * end * 1.85},${floorY(end)}`}
          fill="#7a1a2a"
        />
        {/* Chair rails */}
        {([-1, 1] as const).map((side) => (
          <line
            key={side}
            x1={wallX(side, 1)}
            y1={VP.y + 70}
            x2={wallX(side, end)}
            y2={VP.y + 70 * end}
            stroke={GOLD}
            strokeWidth="3"
          />
        ))}
        <rect
          x={wallX(-1, end)}
          y={ceilY(end)}
          width={600 * end}
          height={480 * end}
          fill="#24133e"
          {...line}
          strokeWidth={2}
        />

        {/* The far doors, more of them the longer the hall gets */}
        {farDoors(end).map(([a, b]) =>
          ([-1, 1] as const).map((side) => (
            <polygon
              key={`${side}${a}`}
              points={doorPoints(side, a, b)}
              fill="#3a200e"
              stroke={INK}
              strokeWidth="1"
            />
          )),
        )}

        {/* Door 13, at the end */}
        <rect
          x={VP.x - 52 * end}
          y={floorY(end) - 210 * end}
          width={104 * end}
          height={210 * end}
          fill="#1a0f08"
          {...thin}
        />
        <rect
          className="hallway-thirteen-glow"
          x={VP.x - 52 * end}
          y={floorY(end) - 6 * end}
          width={104 * end}
          height={6 * end}
          fill="#7dff8a"
        />
        <text
          className="hallway-thirteen"
          x={VP.x}
          y={floorY(end) - 160 * end}
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize={44 * end}
          fontWeight="bold"
          fill="#8fe39a"
        >
          13
        </text>

        {/* The numbered doors */}
        {DOORS.map((d) => (
          <g key={d.n}>
            <polygon
              points={doorPoints(d.side, d.a, d.b)}
              fill={d.fill}
              {...line}
              strokeWidth={2}
            />
            {d.n <= 7 && d.n !== 5 && d.n !== 6 && <Plaque d={d} />}
            {/* Doorknob */}
            <circle
              cx={wallX(d.side, d.b + (d.a - d.b) * 0.22)}
              cy={VP.y + 70 * ((d.a + d.b) / 2)}
              r={6 * d.a}
              fill={GOLD}
              {...thin}
            />
          </g>
        ))}

        {/* Door 1: the foyer's red light under the door */}
        <polygon
          points={`${wallX(-1, 0.92)},${floorY(0.92)} ${wallX(-1, 0.68)},${floorY(0.68)} ${wallX(-1, 0.68) + 6},${floorY(0.68) + 4} ${wallX(-1, 0.92) + 8},${floorY(0.92) + 6}`}
          fill="#ff4a5a"
          opacity="0.55"
        />
        {/* Door 2: your reflection, which is a little late */}
        <g opacity="0.45">
          <circle cx="538" cy="226" r="16" fill="#3a4a58" />
          <path d="M516 320 L522 258 Q538 244 554 258 L560 320 Z" fill="#3a4a58" />
        </g>
        <line x1="518" y1="140" x2="560" y2="380" stroke="#fff" strokeWidth="4" opacity="0.5" />
        {/* Lamps hanging down the middle */}
        {lamps.map((s) => (
          <line
            key={s}
            x1={VP.x}
            y1={ceilY(s)}
            x2={VP.x}
            y2={ceilY(s) + 26 * s}
            stroke="#8a6a2a"
            strokeWidth={Math.max(1, 2 * s)}
          />
        ))}
      </g>

      {/* Moving parts: the arcade behind Door 3 */}
      <polygon
        className="hallway-arcade"
        points={`${wallX(-1, 0.5)},${floorY(0.5)} ${wallX(-1, 0.4)},${floorY(0.4)} ${wallX(-1, 0.4) + 3},${floorY(0.4) + 3} ${wallX(-1, 0.5) + 5},${floorY(0.5) + 5}`}
      />
      <polygon
        className="hallway-arcade hallway-arcade-late"
        points={`${wallX(-1, 0.4)},${doorTop(0.4)} ${wallX(-1, 0.4)},${floorY(0.4)} ${wallX(-1, 0.4) + 3},${floorY(0.4)} ${wallX(-1, 0.4) + 3},${doorTop(0.4)}`}
      />
      <text
        className="hallway-new"
        x="217"
        y="218"
        textAnchor="middle"
        fontFamily="Impact, 'Arial Black', sans-serif"
        fontSize="9"
        fill="#ff2a2a"
      >
        NEW!
      </text>

      {/* The lamps. Tapping the near one puts them out toward you, far ones first. */}
      <g key={`lamps${lampTaps}`}>
        {lamps.map((s, i) => (
          <g
            key={s}
            className={lampTaps ? 'hallway-lamp hallway-lamp-out' : 'hallway-lamp'}
            style={lampTaps ? { animationDelay: `${(lamps.length - 1 - i) * 0.18}s` } : undefined}
          >
            <circle cx={VP.x} cy={ceilY(s) + 34 * s} r={70 * s} fill="url(#hallway-lamp-glow)" />
            <path
              d={`M${VP.x - 16 * s} ${ceilY(s) + 38 * s} L${VP.x - 8 * s} ${ceilY(s) + 24 * s} L${VP.x + 8 * s} ${ceilY(s) + 24 * s} L${VP.x + 16 * s} ${ceilY(s) + 38 * s} Z`}
              fill="#e0b450"
              stroke={INK}
              strokeWidth={Math.max(0.6, 2 * s)}
            />
            <circle cx={VP.x} cy={ceilY(s) + 40 * s} r={4 * s} fill="#fff3c4" />
          </g>
        ))}
      </g>

      {modem > 0 && (
        <g key={`modem${modem}`} className="hallway-modem">
          <text
            x="404"
            y="196"
            textAnchor="end"
            fontFamily="'Courier New', monospace"
            fontSize="13"
            fontWeight="bold"
            fill="#c8f7c5"
          >
            kssshhh
          </text>
          <text
            x="396"
            y="214"
            textAnchor="end"
            fontFamily="'Courier New', monospace"
            fontSize="11"
            fill="#c8f7c5"
          >
            bee-dooo-weee
          </text>
        </g>
      )}

      <rect width="600" height="480" fill="url(#hallway-dark)" pointerEvents="none" />
    </>
  );
}
