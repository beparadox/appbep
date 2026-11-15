import type { Pokes } from './types';

/*
 * The Hall of Mirrors: a carnival sideshow room, harlequin walls and bunting,
 * a row of mirrors along the back wall. The door back to the hallway; a tall
 * thin mirror; the big gold mirror in the middle, where colored bars shuffle
 * and sort themselves (the Sorting Animations exhibit); a wavy mirror; and a
 * wide silver mirror with a door in it that only your reflection can see.
 *
 * Everything here is out of order, then put back in order: the sign over the
 * mirrors starts backwards, and each poke slides its letters closer to right.
 * Poking the tall mirror makes you taller and thinner; the wavy one, wavier.
 *
 * Drawing units: 600 × 480.
 */

const INK = '#0b1e26';
const GOLD = '#d4a64a';
const SILVER = '#c8d6dc';
const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const thin = { stroke: INK, strokeWidth: 1.5 } as const;

const FLOOR = 404;

/* ---------- The sorting mirror: bubble sort, one swap per beat ---------- */

const START = [5, 2, 7, 0, 3, 6, 1, 4];
/** Each state of the list, from shuffled to sorted. */
const FRAMES = (() => {
  const a = [...START];
  const frames = [[...a], [...a]];
  for (let end = a.length - 1; end > 0; end--) {
    for (let i = 0; i < end; i++) {
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        frames.push([...a]);
      }
    }
  }
  return [...frames, [...a], [...a], [...a]];
})();
const BEAT = 0.55; // seconds per swap
const BAR_W = 11;
const BAR_GAP = 2.5;
const BARS_X = 206;
const BARS_BASE = 380;
const slotX = (slot: number) => BARS_X + slot * (BAR_W + BAR_GAP);

/**
 * Each bar's path through the frames, as CSS keyframes (one beat per frame, a
 * quick slide at the start of each beat so the swaps read as swaps).
 */
const BAR_KEYFRAMES = START.map((v) => {
  const steps = FRAMES.flatMap((f, i) => {
    const x = slotX(f.indexOf(v)) - slotX(0);
    const at = (p: number) => ((p / FRAMES.length) * 100).toFixed(2);
    return [
      `${at(i)}%{transform:translateX(${x}px)}`,
      `${at(i + 0.6)}%{transform:translateX(${x}px)}`,
    ];
  });
  return `@keyframes mirrors-bar-${v}{${steps.join('')}100%{transform:translateX(${slotX(START.indexOf(v)) - slotX(0)}px)}}`;
}).join('');

function SortingBars() {
  return (
    <g>
      <style>{`${BAR_KEYFRAMES}.mirrors-bar{animation-duration:${FRAMES.length * BEAT}s;animation-iteration-count:infinite;animation-timing-function:ease-in-out}@media (prefers-reduced-motion: reduce){.mirrors-bar{animation:none!important}}`}</style>
      {START.map((v) => {
        const h = 24 + v * 20;
        return (
          <rect
            key={v}
            className="mirrors-bar"
            style={{
              animationName: `mirrors-bar-${v}`,
              transform: `translateX(${slotX(v) - slotX(0)}px)`, // sorted, when still
            }}
            x={BARS_X}
            y={BARS_BASE - h}
            width={BAR_W}
            height={h}
            fill={`hsl(${v * 42} 75% 58%)`}
            stroke={INK}
            strokeWidth="1"
          />
        );
      })}
    </g>
  );
}

/* ---------- Your reflection ---------- */

/** A person-shaped silhouette, feet at (x, y), `h` tall. */
function You({ x, y, h, fill = '#2a4a58' }: { x: number; y: number; h: number; fill?: string }) {
  const u = h / 100;
  return (
    <g fill={fill}>
      <circle cx={x} cy={y - 88 * u} r={10 * u} />
      <path
        d={`M${x - 15 * u} ${y - 42 * u} L${x - 13 * u} ${y - 70 * u} Q${x} ${y - 78 * u} ${x + 13 * u} ${y - 70 * u} L${x + 15 * u} ${y - 42 * u} L${x + 9 * u} ${y - 42 * u} L${x + 9 * u} ${y} L${x + 2 * u} ${y} L${x} ${y - 36 * u} L${x - 2 * u} ${y} L${x - 9 * u} ${y} L${x - 9 * u} ${y - 42 * u} Z`}
      />
    </g>
  );
}

/** A mirror with an arched top: outer frame and glass. */
function archPath(x: number, y: number, w: number, h: number) {
  return `M${x} ${y + h} L${x} ${y + w / 2} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + w / 2} L${x + w} ${y + h} Z`;
}

/* ---------- The sign ---------- */

const SIGN = 'HALL OF MIRRORS';
/** Where each letter of SIGN sits, by how many times the sign has been poked. */
function signSlots(pokes: number): number[] {
  const n = SIGN.length;
  if (pokes <= 0) return SIGN.split('').map((_, i) => n - 1 - i); // all backwards
  if (pokes === 1) {
    // Words in the right order, letters in each word still backwards
    const slots: number[] = [];
    let start = 0;
    for (const word of SIGN.split(' ')) {
      for (let i = 0; i < word.length; i++) slots.push(start + word.length - 1 - i);
      slots.push(start + word.length); // the space after it
      start += word.length + 1;
    }
    return slots.slice(0, n);
  }
  return SIGN.split('').map((_, i) => i);
}
const SLOT = 16;
const SIGN_X = 300 - (SIGN.length * SLOT) / 2;

function Sign({ pokes }: { pokes: number }) {
  const slots = signSlots(pokes);
  const bulbs = Array.from({ length: 18 }, (_, i) => i);
  return (
    <g>
      <rect x="168" y="22" width="264" height="54" rx="6" fill="#8b1e2e" {...line} />
      <rect x="178" y="32" width="244" height="34" rx="3" fill="#f4e6c4" {...thin} />
      {bulbs.map((i) => (
        <circle
          key={i}
          className={i % 2 ? 'mirrors-bulb' : 'mirrors-bulb mirrors-bulb-b'}
          cx={176 + i * 14.6}
          cy={i % 2 ? 26 : 72}
          r="3"
          fill="#ffe27a"
        />
      ))}
      {SIGN.split('').map((ch, i) =>
        ch === ' ' ? null : (
          <text
            key={i}
            className="mirrors-letter"
            x={SIGN_X + SLOT / 2}
            y="56"
            textAnchor="middle"
            fontFamily="'Rockwell', 'Courier New', serif"
            fontSize="19"
            fontWeight="bold"
            fill="#8b1e2e"
            style={{ transform: `translateX(${slots[i] * SLOT}px)` }}
          >
            {ch}
          </text>
        ),
      )}
    </g>
  );
}

export default function MirrorsArt({ pokes }: { pokes: Pokes }) {
  return (
    <>
      <defs>
        <pattern id="mirrors-harlequin" width="40" height="48" patternUnits="userSpaceOnUse">
          <rect width="40" height="48" fill="#0f3a46" />
          <polygon points="20,0 40,24 20,48 0,24" fill="#155160" />
          <circle cx="20" cy="24" r="2" fill={GOLD} opacity="0.5" />
        </pattern>
        <linearGradient id="mirrors-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8eef4" />
          <stop offset="0.5" stopColor="#9cc6d2" />
          <stop offset="1" stopColor="#6f9fae" />
        </linearGradient>
        <linearGradient id="mirrors-dark-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d3a46" />
          <stop offset="1" stopColor="#0c1c24" />
        </linearGradient>
        <linearGradient id="mirrors-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24434e" />
          <stop offset="1" stopColor="#0e1e24" />
        </linearGradient>
        <clipPath id="mirrors-tall-clip">
          <path d={archPath(130, 126, 44, 268)} />
        </clipPath>
        <clipPath id="mirrors-wavy-clip">
          <path d={archPath(346, 126, 44, 268)} />
        </clipPath>
        <clipPath id="mirrors-sort-clip">
          <path d={archPath(204, 112, 112, 280)} />
        </clipPath>
        <clipPath id="mirrors-door-clip">
          <rect x="426" y="124" width="144" height="268" />
        </clipPath>
        <filter id="mirrors-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="17" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <radialGradient id="mirrors-light" cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor="#e6fbff" stopOpacity="0.12" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <g filter="url(#mirrors-ink)">
        {/* Walls, bunting, floor */}
        <rect width="600" height="480" fill="url(#mirrors-harlequin)" />
        <polygon
          points={`0,${FLOOR} 600,${FLOOR - 6} 600,480 0,480`}
          fill="url(#mirrors-floor)"
          {...line}
        />
        {Array.from({ length: 15 }, (_, i) => (
          <polygon
            key={i}
            points={`${i * 40},0 ${i * 40 + 40},0 ${i * 40 + 20},${i % 2 ? 18 : 22}`}
            fill={i % 2 ? '#f4e6c4' : '#b8283c'}
            {...thin}
          />
        ))}
        {/* Light from the mirrors, lying on the floor */}
        {[
          [130, 174],
          [204, 316],
          [346, 390],
          [426, 570],
        ].map(([a, b]) => (
          <polygon
            key={a}
            points={`${a},${FLOOR} ${b},${FLOOR} ${b + 12},480 ${a - 12},480`}
            fill="#bfe6f0"
            opacity="0.1"
          />
        ))}

        {/* Back to the hallway: the hallway's purple through the frame */}
        <rect x="22" y="186" width="88" height="220" fill="#3a2160" {...line} />
        <rect x="30" y="194" width="72" height="212" fill="#5b3418" {...line} strokeWidth={2} />
        <rect x="38" y="204" width="56" height="80" fill="none" stroke="#3a1f0c" strokeWidth="2" />
        <rect x="38" y="296" width="56" height="98" fill="none" stroke="#3a1f0c" strokeWidth="2" />
        <circle cx="92" cy="300" r="5" fill={GOLD} {...thin} />

        {/* The tall thin mirror */}
        <path d={archPath(124, 120, 56, 280)} fill={SILVER} {...line} />
        <path d={archPath(130, 126, 44, 268)} fill="url(#mirrors-glass)" {...thin} />
        <g clipPath="url(#mirrors-tall-clip)">
          <g
            transform={`translate(152 392) scale(${0.55 - 0.06 * Math.min(pokes.tall ?? 0, 3)} ${1.75 + 0.25 * Math.min(pokes.tall ?? 0, 3)}) translate(-152 -392)`}
          >
            <You x={152} y={392} h={150} />
          </g>
        </g>

        {/* The sorting mirror, in an ornate gold frame */}
        <path d={archPath(194, 102, 132, 300)} fill={GOLD} {...line} />
        <path d={archPath(200, 108, 120, 288)} fill="none" stroke="#a87a2a" strokeWidth="2" />
        <circle cx="260" cy="106" r="9" fill={GOLD} {...line} strokeWidth={2} />
        <path d={archPath(204, 112, 112, 280)} fill="url(#mirrors-dark-glass)" {...thin} />

        {/* The wavy mirror */}
        <path d={archPath(340, 120, 56, 280)} fill={SILVER} {...line} />
        <path d={archPath(346, 126, 44, 268)} fill="url(#mirrors-glass)" {...thin} />

        {/* The wide silver mirror with a door in it */}
        <rect x="414" y="112" width="168" height="292" rx="4" fill={SILVER} {...line} />
        <rect x="426" y="124" width="144" height="268" fill="url(#mirrors-glass)" {...thin} />
        <g clipPath="url(#mirrors-door-clip)">
          <line x1="426" y1="372" x2="570" y2="372" stroke="#5f8f9e" strokeWidth="2" />
          <rect x="482" y="214" width="70" height="158" fill="#6b4a2a" {...line} strokeWidth={2} />
          <rect
            x="490"
            y="224"
            width="54"
            height="58"
            fill="none"
            stroke="#4a2f18"
            strokeWidth="1.5"
          />
          <rect
            x="490"
            y="292"
            width="54"
            height="70"
            fill="none"
            stroke="#4a2f18"
            strokeWidth="1.5"
          />
          {/* The knob is on the wrong side, and the sign reads backwards */}
          <circle cx="490" cy="296" r="4" fill={GOLD} {...thin} />
          <text
            x="517"
            y="208"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="13"
            fontWeight="bold"
            fill="#2a4a58"
            transform="translate(1034 0) scale(-1 1)"
          >
            DOOR
          </text>
          <polygon points="482,372 552,372 560,380 474,380" fill="#fff6c4" opacity="0.6" />
        </g>
      </g>

      {/* Moving parts */}
      <g clipPath="url(#mirrors-sort-clip)">
        <SortingBars />
        <line
          x1="204"
          y1={BARS_BASE}
          x2="316"
          y2={BARS_BASE}
          stroke="#bfe6f0"
          strokeWidth="1.5"
          opacity="0.6"
        />
      </g>

      <Sign pokes={pokes.sign ?? 0} />

      <g clipPath="url(#mirrors-wavy-clip)">
        <g
          key={`wavy${pokes.wavy ?? 0}`}
          className={pokes.wavy ? 'mirrors-wavy mirrors-wavy-more' : 'mirrors-wavy'}
        >
          <You x={368} y={392} h={150} />
        </g>
      </g>

      <g clipPath="url(#mirrors-door-clip)">
        <g className="mirrors-reflection">
          <You x={452} y={372} h={140} />
        </g>
      </g>

      {/* Glints on the glass */}
      {[
        [134, 150, 150, 210],
        [350, 150, 366, 210],
        [432, 132, 470, 190],
        [210, 170, 232, 140],
      ].map(([x1, y1, x2, y2]) => (
        <line
          key={x1}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#fff"
          strokeWidth="3"
          opacity="0.45"
        />
      ))}

      <rect width="600" height="480" fill="url(#mirrors-light)" pointerEvents="none" />
    </>
  );
}
