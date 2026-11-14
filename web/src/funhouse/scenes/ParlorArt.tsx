/*
 * The Parlor of Patience: striped wallpaper, a crooked back wall, two puzzles
 * hung as paintings, a fireplace, an armchair, a grandfather clock that runs
 * too fast, the door back to the foyer on the left wall, and a very small door.
 *
 * Drawing units: 600 × 480. Everything still is inside the "ink" filter (wobbly
 * hand-drawn outlines); things that move (fire, pendulum, clock hand) sit
 * outside it, so the browser doesn't redraw the whole room every frame.
 */

const INK = '#1a0d08';
const GOLD = '#c9973f';
const CANVAS = '#e9dcc0';

const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;

/** The N-Puzzizzle painting's tiles (0 = the gap), mid-solve. */
const TILES = [
  [1, 2, 3],
  [4, 0, 6],
  [7, 5, 8],
];

/** Towers of Hanoi disks on the left peg, biggest first. */
const DISKS = [
  { w: 34, fill: '#c0392b' },
  { w: 27, fill: '#e67e22' },
  { w: 20, fill: '#f1c40f' },
];

export default function ParlorArt() {
  return (
    <>
      <defs>
        <pattern id="parlor-paper" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#5a1e1e" />
          <rect x="20" width="20" height="40" fill="#4c1818" />
          <path d="M10 12 L14 20 L10 28 L6 20 Z" fill="#b8873a" opacity="0.55" />
        </pattern>
        <filter id="parlor-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <radialGradient id="parlor-glow" cx="50%" cy="72%" r="75%">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <g filter="url(#parlor-ink)">
        {/* The room: ceiling, side walls, a back wall that isn't quite square, floor. */}
        <polygon points="0,0 600,0 535,22 70,30" fill="#24100a" {...line} />
        <polygon points="70,30 535,22 545,362 62,352" fill="url(#parlor-paper)" {...line} />
        <polygon points="0,0 70,30 62,352 0,480" fill="url(#parlor-paper)" {...line} />
        <polygon points="0,0 70,30 62,352 0,480" fill="#000" opacity="0.35" />
        <polygon points="600,0 535,22 545,362 600,480" fill="url(#parlor-paper)" {...line} />
        <polygon points="600,0 535,22 545,362 600,480" fill="#000" opacity="0.35" />
        <polygon points="63,300 543,308 545,362 62,352" fill="#3b2412" {...line} />
        <polygon points="62,352 545,362 600,480 0,480" fill="#6b4423" {...line} />
        {[
          [150, 354, 108],
          [250, 356, 228],
          [350, 358, 362],
          [450, 360, 492],
        ].map(([x1, y1, x2]) => (
          <line key={x1} x1={x1} y1={y1} x2={x2} y2={480} stroke="#4a2d14" strokeWidth="2" />
        ))}

        {/* Rug */}
        <ellipse cx="300" cy="428" rx="175" ry="34" fill="#7a2f2f" {...line} />
        <ellipse
          cx="300"
          cy="428"
          rx="145"
          ry="24"
          fill="none"
          stroke="#c79a4a"
          strokeWidth="2"
          strokeDasharray="6 5"
        />

        {/* The door back to the foyer, on the left wall */}
        <polygon points="14,150 50,190 50,377 14,451" fill="#5b3418" {...line} />
        <polygon
          points="20,175 44,201 44,270 20,262"
          fill="none"
          stroke="#3a210f"
          strokeWidth="2"
        />
        <polygon
          points="20,290 44,293 44,360 20,410"
          fill="none"
          stroke="#3a210f"
          strokeWidth="2"
        />
        <circle cx="42" cy="292" r="3.5" fill={GOLD} stroke={INK} strokeWidth="1.5" />

        {/* Painting: Towers of Hanoi (hangs a little crooked) */}
        <g transform="rotate(-4 180 118)">
          <path d="M180 42 L118 64 M180 42 L242 64" stroke={INK} strokeWidth="1.5" fill="none" />
          <rect x="105" y="62" width="150" height="112" fill={GOLD} {...line} />
          <rect x="115" y="72" width="130" height="92" fill={CANVAS} {...line} strokeWidth={2} />
          <line x1="124" y1="152" x2="236" y2="152" stroke="#6b4423" strokeWidth="4" />
          {[145, 180, 215].map((x) => (
            <line key={x} x1={x} y1="98" x2={x} y2="152" stroke="#6b4423" strokeWidth="3" />
          ))}
          {DISKS.map((d, i) => (
            <rect
              key={d.w}
              x={145 - d.w / 2}
              y={143 - i * 9}
              width={d.w}
              height="8"
              rx="2"
              fill={d.fill}
              stroke={INK}
              strokeWidth="1.5"
            />
          ))}
          <rect
            x="203"
            y="143"
            width="24"
            height="8"
            rx="2"
            fill="#27ae60"
            stroke={INK}
            strokeWidth="1.5"
          />
        </g>

        {/* Painting: N-Puzzizzle, mid-solve (hangs crooked the other way) */}
        <g transform="rotate(5 420 120)">
          <path d="M420 36 L360 57 M420 36 L480 57" stroke={INK} strokeWidth="1.5" fill="none" />
          <rect x="352" y="55" width="136" height="130" fill={GOLD} {...line} />
          <rect x="362" y="65" width="116" height="110" fill={CANVAS} {...line} strokeWidth={2} />
          {TILES.flatMap((row, r) =>
            row.map((n, c) => {
              const x = 372 + c * 32;
              const y = 72 + r * 32;
              return n === 0 ? (
                <rect key={n} x={x} y={y} width="30" height="30" fill="#3a2414" />
              ) : (
                <g key={n}>
                  <rect
                    x={x}
                    y={y}
                    width="30"
                    height="30"
                    fill="#f5e6c4"
                    stroke="#6b4423"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x + 15}
                    y={y + 21}
                    textAnchor="middle"
                    fontFamily="Georgia, serif"
                    fontSize="16"
                    fontWeight="bold"
                    fill="#4a2d14"
                  >
                    {n}
                  </text>
                </g>
              );
            }),
          )}
        </g>

        {/* Fireplace */}
        <rect x="240" y="250" width="120" height="108" fill="#9c6b45" {...line} />
        <rect x="226" y="236" width="148" height="15" fill="#7a4a26" {...line} />
        <path d="M262 357 L262 292 Q300 262 338 292 L338 357 Z" fill="#1b0c06" {...line} />
        <rect x="246" y="222" width="7" height="14" fill="#efe2c8" stroke={INK} strokeWidth="1.5" />
        <rect x="347" y="222" width="7" height="14" fill="#efe2c8" stroke={INK} strokeWidth="1.5" />
        <rect
          x="276"
          y="344"
          width="48"
          height="9"
          rx="4"
          fill="#5b3418"
          stroke={INK}
          strokeWidth="2"
        />

        {/* Armchair, green velvet, facing the fire */}
        <path d="M86 336 Q124 300 162 336 L162 398 L86 398 Z" fill="#2f5a4a" {...line} />
        <rect x="80" y="386" width="88" height="26" rx="6" fill="#3a6b58" {...line} />
        <rect x="72" y="368" width="18" height="44" rx="7" fill="#2f5a4a" {...line} />
        <rect x="158" y="368" width="18" height="44" rx="7" fill="#2f5a4a" {...line} />
        <path d="M86 412 L84 426 M162 412 L164 426" {...line} />

        {/* Grandfather clock */}
        <path d="M472 190 L472 150 Q498 126 524 150 L524 190 Z" fill="#5b3418" {...line} />
        <rect x="478" y="190" width="40" height="168" fill="#4a2a14" {...line} />
        <circle cx="498" cy="166" r="16" fill="#f3e6c4" {...line} strokeWidth={2} />
        <line x1="498" y1="166" x2="498" y2="155" stroke={INK} strokeWidth="2" />
        <rect
          x="486"
          y="212"
          width="24"
          height="96"
          rx="3"
          fill="#2a170b"
          {...line}
          strokeWidth={2}
        />

        {/* A very small door */}
        <path d="M404 360 L404 336 Q418 318 432 336 L432 360 Z" fill="#6b3f1d" {...line} />
        <circle cx="427" cy="347" r="2" fill={GOLD} />
      </g>

      {/* Things that move */}
      <g className="parlor-fire">
        <path d="M278 356 Q283 318 300 296 Q314 322 322 356 Z" fill="#e8742a" />
        <path d="M289 356 Q294 333 302 318 Q310 336 313 356 Z" fill="#ffd166" />
      </g>
      <line
        className="parlor-minute"
        x1="498"
        y1="166"
        x2="508"
        y2="166"
        stroke={INK}
        strokeWidth="2"
      />
      <g className="parlor-pendulum">
        <line x1="498" y1="216" x2="498" y2="284" stroke={GOLD} strokeWidth="2" />
        <circle cx="498" cy="290" r="7" fill={GOLD} stroke={INK} strokeWidth="1.5" />
      </g>

      {/* Firelight and dark corners */}
      <rect width="600" height="480" fill="url(#parlor-glow)" />
    </>
  );
}
