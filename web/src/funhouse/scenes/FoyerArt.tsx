import type { Pokes } from './types';

/*
 * The Grand Foyer: velvet wallpaper, a checkered marble floor, and a humming
 * chandelier. A heavy oak door (to the parlor), a narrow door under a red EXIT
 * sign, the long hallway going back and back, a grand staircase climbing away to
 * the right, a suit of armor, and a welcome mat.
 *
 * The art reacts to pokes: the EXIT door, once tried, stays open on its bricks;
 * the mat's corner turns up on a key, then someone corrects WELCOME; the armor's
 * visor goes up, then its halberd changes hands; the chandelier jolts.
 *
 * Drawing units: 600 × 480.
 */

const INK = '#1a0d08';
const GOLD = '#c9973f';
const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const thin = { stroke: INK, strokeWidth: 1.5 } as const;

const FLOOR = 422;

/** Checkered floor tiles in perspective, converging on (300, 200). */
const TILES = (() => {
  const rows = [FLOOR, 436, 455, 480];
  const at = (xb: number, y: number) => 300 + ((xb - 300) * (y - 200)) / 280;
  const tiles: { points: string; dark: boolean }[] = [];
  for (let j = 0; j < rows.length - 1; j++) {
    for (let k = 0; k < 16; k++) {
      const a = -300 + k * 75;
      const b = a + 75;
      const [y0, y1] = [rows[j], rows[j + 1]];
      tiles.push({
        points: `${at(a, y0)},${y0} ${at(b, y0)},${y0} ${at(b, y1)},${y1} ${at(a, y1)},${y1}`,
        dark: (j + k) % 2 === 0,
      });
    }
  }
  return tiles;
})();

/** The hallway recedes toward this point. */
const VP = { x: 300, y: 322 };
const DEPTHS = [0.74, 0.54, 0.4, 0.29, 0.21, 0.15, 0.1];
const ARCH = 'M246 422 L246 252 Q300 198 354 252 L354 422 Z';
/** Little doors along the hallway's walls: [near depth, far depth, side]. */
const HALL_DOORS: [number, number, -1 | 1][] = [
  [0.7, 0.58, -1],
  [0.62, 0.5, 1],
  [0.44, 0.37, -1],
  [0.39, 0.33, 1],
  [0.27, 0.235, -1],
  [0.24, 0.21, 1],
];

/** The staircase: eight steps rising to the right. */
const STEPS = Array.from({ length: 8 }, (_, i) => ({ x: 414 + i * 23, top: 440 - (i + 1) * 30 }));

function Hallway() {
  const toward = (s: number) =>
    `translate(${VP.x} ${VP.y}) scale(${s}) translate(${-VP.x} ${-VP.y})`;
  return (
    <g>
      <clipPath id="foyer-hall-clip">
        <path d={ARCH} />
      </clipPath>
      <g clipPath="url(#foyer-hall-clip)">
        <rect x="240" y="190" width="120" height="240" fill="url(#foyer-hall-dark)" />
        {/* Runner, running away */}
        <polygon points="278,422 322,422 302,324 298,324" fill="#6e1524" />
        {HALL_DOORS.map(([a, b, side]) => {
          const x = (s: number) => VP.x + side * 54 * s;
          return (
            <polygon
              key={a}
              points={`${x(a)},${VP.y - 62 * a} ${x(b)},${VP.y - 62 * b} ${x(b)},${VP.y + 100 * b} ${x(a)},${VP.y + 100 * a}`}
              fill="#4a2c16"
              stroke={INK}
              strokeWidth="1"
              opacity={0.35 + a}
            />
          );
        })}
        {DEPTHS.map((s) => (
          <path
            key={s}
            d={ARCH}
            fill="none"
            stroke={GOLD}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            opacity={0.15 + s * 0.8}
            transform={toward(s)}
          />
        ))}
        {/* Something lit, far away */}
        <circle cx={VP.x} cy={VP.y - 2} r="2.5" fill="#ffd98a" />
      </g>
      <path d={ARCH} fill="none" stroke={GOLD} strokeWidth="8" strokeLinejoin="round" />
      <path d={ARCH} fill="none" {...line} />
    </g>
  );
}

function OakDoor() {
  const door = 'M36 420 L36 256 Q84 196 132 256 L132 420 Z';
  return (
    <g>
      <path d="M24 422 L24 252 Q84 178 144 252 L144 422 Z" fill="#6b6258" {...line} />
      {[
        [30, 300],
        [30, 360],
        [138, 300],
        [138, 360],
      ].map(([x, y]) => (
        <line
          key={`${x}${y}`}
          x1={x - 6}
          y1={y}
          x2={x + 6}
          y2={y}
          stroke="#4a443c"
          strokeWidth="2"
        />
      ))}
      <clipPath id="foyer-oak-clip">
        <path d={door} />
      </clipPath>
      <path d={door} fill="#6b3418" />
      <g clipPath="url(#foyer-oak-clip)">
        {[54, 72, 90, 108].map((x) => (
          <line key={x} x1={x} y1="190" x2={x} y2="420" stroke="#4a2410" strokeWidth="2" />
        ))}
        {[292, 384].map((y) => (
          <rect key={y} x="30" y={y} width="110" height="9" fill="#2b2b2b" />
        ))}
      </g>
      <path d={door} fill="none" {...line} />
      {/* The knocker */}
      <circle cx="84" cy="336" r="5" fill="#8a6a2a" {...thin} />
      <circle cx="84" cy="348" r="11" fill="none" stroke={GOLD} strokeWidth="3.5" />
    </g>
  );
}

function ExitDoor({ tried }: { tried: boolean }) {
  return (
    <g>
      <rect x="160" y="290" width="60" height="132" fill="#2a2a2a" {...line} />
      {tried ? (
        <>
          <rect x="166" y="296" width="48" height="126" fill="url(#foyer-bricks)" />
          <text
            x="190"
            y="364"
            textAnchor="middle"
            fontFamily="'Comic Sans MS', 'Comic Neue', cursive"
            fontSize="17"
            fontWeight="bold"
            fill="#f4f4f4"
            transform="rotate(-8 190 360)"
          >
            lol
          </text>
          {/* The door, swung open toward you */}
          <polygon
            points="166,296 148,286 148,432 166,422"
            fill="#3d4a40"
            {...line}
            strokeWidth={2}
          />
        </>
      ) : (
        <>
          <rect x="166" y="296" width="48" height="126" fill="#3d4a40" {...thin} />
          <rect x="170" y="352" width="40" height="7" rx="3" fill="#9aa39a" {...thin} />
          <rect x="174" y="306" width="32" height="30" fill="#33403a" {...thin} />
        </>
      )}
    </g>
  );
}

function Staircase() {
  const profile = [
    'M414 440',
    ...STEPS.map(({ x, top }) => `L${x} ${top} L${x + 23} ${top}`),
    'L600 200 L600 440 Z',
  ].join(' ');
  const runner = STEPS.map(({ x, top }) => `M${x} ${top + 30} L${x} ${top} L${x + 23} ${top}`).join(
    ' ',
  );
  const rail = STEPS.map(({ x, top }) => `${x + 12},${top - 66}`);
  return (
    <g>
      <path d={profile} fill="#5b3418" {...line} />
      {/* Panels on the stair's side */}
      {[0, 1, 2].map((i) => (
        <polygon
          key={i}
          points={`${430 + i * 56},428 ${478 + i * 56},428 ${478 + i * 56},${404 - (i + 1) * 70 + 40} ${430 + i * 56},${404 - i * 70 + 10}`}
          fill="#4a2a12"
          stroke="#3a1f0c"
          strokeWidth="2"
        />
      ))}
      <path d={runner} fill="none" stroke="#a52a2a" strokeWidth="7" strokeLinejoin="miter" />
      {STEPS.map(({ x, top }) => (
        <circle key={x} cx={x} cy={top + 1} r="2.5" fill="#e0b450" />
      ))}
      {/* Banister */}
      {STEPS.map(({ x, top }) => (
        <line
          key={x}
          x1={x + 12}
          y1={top}
          x2={x + 12}
          y2={top - 66}
          stroke="#efe2c8"
          strokeWidth="4"
        />
      ))}
      <polyline
        points={['424,334', ...rail, '608,124'].join(' ')}
        fill="none"
        stroke={INK}
        strokeWidth="11"
        strokeLinejoin="round"
      />
      <polyline
        points={['424,334', ...rail, '608,124'].join(' ')}
        fill="none"
        stroke="#6b3418"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      {/* Newel post */}
      <rect x="412" y="336" width="24" height="104" fill="#5a2a12" {...line} />
      <rect x="408" y="326" width="32" height="12" fill="#6b3418" {...line} />
      <circle cx="424" cy="318" r="8" fill="#6b3418" {...line} />
      <rect x="408" y="430" width="32" height="12" fill="#6b3418" {...line} />
    </g>
  );
}

function Armor({ pokes }: { pokes: number }) {
  const visorUp = pokes >= 2;
  const hx = pokes >= 3 ? 404 : 366; // the halberd changes hands
  return (
    <g>
      <rect x="370" y="430" width="34" height="10" fill="#4a443c" {...thin} />
      <line x1={hx} y1="438" x2={hx} y2="290" stroke="#5a3a22" strokeWidth="3" />
      <path
        d={`M${hx} 288 L${hx} 306 Q${hx + (hx > 387 ? 10 : -10)} 300 ${hx + (hx > 387 ? 12 : -12)} 290 Z`}
        fill="#b9b9b9"
        {...thin}
      />
      <path d={`M${hx - 3} 288 L${hx} 278 L${hx + 3} 288 Z`} fill="#b9b9b9" {...thin} />
      {/* Legs and body */}
      <rect x="376" y="384" width="9" height="46" fill="#a9adb2" {...thin} />
      <rect x="389" y="384" width="9" height="46" fill="#a9adb2" {...thin} />
      <path d="M372 336 L402 336 L398 388 L376 388 Z" fill="#b9bdc2" {...line} strokeWidth={2} />
      <path d="M376 346 L398 346" stroke={INK} strokeWidth="1" opacity="0.5" />
      <circle cx="372" cy="340" r="7" fill="#a9adb2" {...thin} />
      <circle cx="402" cy="340" r="7" fill="#a9adb2" {...thin} />
      <line
        x1="370"
        y1="346"
        x2={hx < 387 ? hx + 1 : 368}
        y2="376"
        stroke="#a9adb2"
        strokeWidth="6"
      />
      <line
        x1="404"
        y1="346"
        x2={hx > 387 ? hx - 1 : 406}
        y2="376"
        stroke="#a9adb2"
        strokeWidth="6"
      />
      {/* Helmet */}
      <path
        d="M375 334 L375 316 Q387 296 399 316 L399 334 Z"
        fill="#c4c8cc"
        {...line}
        strokeWidth={2}
      />
      {visorUp ? (
        <>
          <rect x="378" y="318" width="18" height="8" fill="#050505" />
          <path
            d="M376 316 Q387 300 398 316 L398 312 Q387 296 376 312 Z"
            fill="#9aa0a6"
            {...thin}
          />
        </>
      ) : (
        <>
          <line x1="378" y1="320" x2="396" y2="320" stroke={INK} strokeWidth="2" />
          <line x1="378" y1="325" x2="396" y2="325" stroke={INK} strokeWidth="1.5" />
        </>
      )}
      <path d="M387 300 Q392 288 400 292" fill="none" stroke="#a52a2a" strokeWidth="3" />
    </g>
  );
}

function Mat({ pokes }: { pokes: number }) {
  return (
    <g>
      <polygon points="258,442 342,442 352,470 248,470" fill="#7a5a2a" {...line} strokeWidth={2} />
      <polygon
        points="262,445 338,445 346,467 254,467"
        fill="none"
        stroke="#5a3e18"
        strokeWidth="1.5"
      />
      <text
        x="300"
        y="461"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="12"
        fontWeight="bold"
        letterSpacing="1"
        fill="#3a2410"
      >
        WELCOME
      </text>
      {pokes >= 2 && (
        <g className="foyer-stay">
          <line x1="268" y1="456" x2="332" y2="456" stroke="#a52a2a" strokeWidth="2" />
          <text
            x="300"
            y="438"
            textAnchor="middle"
            fontFamily="'Comic Sans MS', 'Comic Neue', cursive"
            fontSize="13"
            fontWeight="bold"
            fill="#c0392b"
            transform="rotate(-4 300 434)"
          >
            STAY
          </text>
        </g>
      )}
      {pokes >= 1 && (
        <>
          {/* The corner, turned up on a key */}
          <polygon points="352,470 334,470 343,452" fill="#a07a42" {...thin} />
          <g transform="rotate(-15 360 470)">
            <circle cx="358" cy="470" r="4" fill="none" stroke={GOLD} strokeWidth="2" />
            <line x1="362" y1="470" x2="376" y2="470" stroke={GOLD} strokeWidth="2" />
            <line x1="372" y1="470" x2="372" y2="474" stroke={GOLD} strokeWidth="2" />
          </g>
        </>
      )}
    </g>
  );
}

const CANDLES = [-42, -21, 0, 21, 42];

function Chandelier() {
  return (
    <>
      <line x1="300" y1="0" x2="300" y2="58" stroke={GOLD} strokeWidth="2.5" />
      {[10, 22, 34, 46].map((y) => (
        <ellipse
          key={y}
          cx="300"
          cy={y}
          rx="2.5"
          ry="4"
          fill="none"
          stroke="#8a6a2a"
          strokeWidth="1.5"
        />
      ))}
      {CANDLES.map((dx) => (
        <path
          key={dx}
          d={`M300 70 Q${300 + dx * 0.6} 96 ${300 + dx} 84`}
          fill="none"
          stroke={GOLD}
          strokeWidth="3"
        />
      ))}
      <ellipse cx="300" cy="70" rx="16" ry="12" fill={GOLD} {...thin} />
      <ellipse cx="300" cy="88" rx="48" ry="6" fill="none" stroke={GOLD} strokeWidth="2.5" />
      {CANDLES.map((dx) => (
        <g key={dx}>
          <rect x={296 + dx} y="70" width="8" height="14" fill="#f2ead2" {...thin} />
          <path
            className="foyer-flame"
            d={`M${300 + dx} 58 Q${305 + dx} 66 ${300 + dx} 70 Q${295 + dx} 66 ${300 + dx} 58 Z`}
            fill="#ffcf4d"
          />
          <path
            d={`M${300 + dx} 94 L${303 + dx} 102 L${300 + dx} 110 L${297 + dx} 102 Z`}
            fill="#dff2ff"
            opacity="0.8"
            {...thin}
          />
        </g>
      ))}
      <path d="M300 82 L304 96 L300 116 L296 96 Z" fill="#dff2ff" opacity="0.85" {...thin} />
    </>
  );
}

export default function FoyerArt({ pokes }: { pokes: Pokes }) {
  const jolts = pokes.chandelier ?? 0;
  return (
    <>
      <defs>
        <pattern id="foyer-velvet" width="40" height="48" patternUnits="userSpaceOnUse">
          <rect width="40" height="48" fill="#4a0b16" />
          <path d="M20 6 Q30 16 20 28 Q10 16 20 6 Z" fill="#6e1524" />
          <path d="M20 28 Q24 34 20 40 Q16 34 20 28 Z" fill="#6e1524" />
          <circle cx="0" cy="24" r="3" fill="#6e1524" />
          <circle cx="40" cy="24" r="3" fill="#6e1524" />
          <circle cx="20" cy="17" r="2" fill="#b8873a" opacity="0.5" />
        </pattern>
        <pattern id="foyer-bricks" width="24" height="14" patternUnits="userSpaceOnUse">
          <rect width="24" height="14" fill="#8a3a22" />
          <path
            d="M0 0 H24 M0 7 H24 M12 0 V7 M0 7 V14 M24 7 V14"
            stroke="#c9b9a0"
            strokeWidth="1.5"
          />
        </pattern>
        <linearGradient id="foyer-hall-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c0d06" />
          <stop offset="0.6" stopColor="#0a0402" />
          <stop offset="1" stopColor="#2a160a" />
        </linearGradient>
        <filter id="foyer-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <radialGradient id="foyer-light" cx="50%" cy="20%" r="80%">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>

      <g filter="url(#foyer-ink)">
        {/* Velvet walls, a gold rail, dark wainscoting */}
        <rect width="600" height="480" fill="url(#foyer-velvet)" />
        <rect x="0" y="336" width="600" height={FLOOR - 336} fill="#3a2010" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect
            key={i}
            x={6 + i * 75}
            y="348"
            width="63"
            height="62"
            fill="none"
            stroke="#24130a"
            strokeWidth="2"
          />
        ))}
        <rect x="0" y="330" width="600" height="7" fill={GOLD} {...thin} />
        <rect x="0" y="0" width="600" height="14" fill="#2a160a" />
        <rect x="0" y="14" width="600" height="5" fill={GOLD} {...thin} />

        {/* Checkered marble floor */}
        {TILES.map((t) => (
          <polygon key={t.points} points={t.points} fill={t.dark ? '#1c1c1c' : '#e8e0cc'} />
        ))}
        <line x1="0" y1={FLOOR} x2="600" y2={FLOOR} {...line} />

        <OakDoor />
        <ExitDoor tried={(pokes['A door marked EXIT'] ?? 0) > 0} />
        <Hallway />
        <Staircase />
        <Armor pokes={pokes.armor ?? 0} />
        <Mat pokes={pokes.mat ?? 0} />
      </g>

      {/* Moving parts */}
      <g className="foyer-exit-sign">
        <rect x="166" y="264" width="48" height="20" fill="#2a0606" {...line} strokeWidth={2} />
        <text
          x="190"
          y="279"
          textAnchor="middle"
          fontFamily="Impact, 'Arial Black', sans-serif"
          fontSize="14"
          letterSpacing="1"
          fill="#ff4a3a"
        >
          EXIT
        </text>
      </g>

      <g
        key={jolts}
        className={jolts ? 'foyer-chandelier foyer-chandelier-jolt' : 'foyer-chandelier'}
      >
        <Chandelier />
      </g>

      <rect width="600" height="480" fill="url(#foyer-light)" pointerEvents="none" />
    </>
  );
}
