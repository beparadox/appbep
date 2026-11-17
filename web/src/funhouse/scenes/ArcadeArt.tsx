import type { Pokes } from './types';

/*
 * The Arcade: a dark room lit by neon and screens, on that carpet every arcade
 * has. The door back to the hallway; a high score board; a change machine; the
 * two cabinets (WTF Blaster and POPFishies), each playing itself on its screen;
 * and a claw machine.
 *
 * The claw machine is SKILL TESTER, playable (src/skilltester); in here it drops
 * by itself now and then, like the cabinets playing themselves.
 *
 * The art reacts to pokes: YOU turns up on
 * the high score board, and every third look APF is briefly on top; the change
 * machine pays out tokens until it runs out.
 *
 * Drawing units: 600 × 480.
 */

const INK = '#05010d';
const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const thin = { stroke: INK, strokeWidth: 1.5 } as const;
const PIXEL = "'Courier New', ui-monospace, monospace";

const FLOOR = 412;

/** Where the cabinets stand (left edge); each is 100 wide. */
const WTF_X = 228;
const POP_X = 350;
const SCREEN = { dx: 16, y: 186, w: 68, h: 58 };

function Cabinet({
  x,
  body,
  trim,
  title,
}: {
  x: number;
  body: string;
  trim: string;
  title: string;
}) {
  return (
    <g>
      {/* Glow on the floor in front */}
      <ellipse cx={x + 50} cy={FLOOR + 10} rx="62" ry="10" fill={trim} opacity="0.25" />
      <polygon points={`${x},168 ${x + 100},168 ${x + 100},420 ${x},420`} fill={body} {...line} />
      <rect x={x + 3} y="140" width="94" height="30" fill={trim} {...line} />
      <text
        x={x + 50}
        y="160"
        textAnchor="middle"
        fontFamily="Impact, 'Arial Black', sans-serif"
        fontSize="14"
        textLength="82"
        lengthAdjust="spacingAndGlyphs"
        fill={INK}
      >
        {title}
      </text>
      <rect x={x + 9} y="179" width="82" height="72" rx="4" fill="#111" {...line} strokeWidth={2} />
      {/* Control panel: a joystick and two buttons */}
      <polygon
        points={`${x - 5},266 ${x + 105},266 ${x + 100},292 ${x},292`}
        fill={trim}
        {...line}
      />
      <line x1={x + 28} y1="276" x2={x + 26} y2="258" stroke="#222" strokeWidth="3" />
      <circle cx={x + 26} cy="256" r="6" fill="#e0263a" {...thin} />
      <circle cx={x + 62} cy="279" r="5" fill="#ffe14d" {...thin} />
      <circle cx={x + 78} cy="279" r="5" fill="#3af2ff" {...thin} />
      {/* Coin door */}
      <rect x={x + 30} y="326" width="40" height="48" rx="2" fill="#1d1d1d" {...thin} />
      <rect x={x + 30} y="380" width="40" height="8" fill="#1d1d1d" {...thin} />
      <rect x={x - 2} y="410" width="104" height="12" fill="#111" {...thin} />
      <line x1={x + 6} y1="300" x2={x + 6} y2="404" stroke={trim} strokeWidth="3" opacity="0.7" />
      <line x1={x + 94} y1="300" x2={x + 94} y2="404" stroke={trim} strokeWidth="3" opacity="0.7" />
    </g>
  );
}

/** The INSERT COIN lights on a coin door. */
function CoinLights({ x }: { x: number }) {
  return (
    <g className="arcade-coin">
      <rect x={x + 36} y="334" width="10" height="16" fill="#ff2a2a" />
      <rect x={x + 54} y="334" width="10" height="16" fill="#ff2a2a" />
    </g>
  );
}

/** WTF Blaster, playing itself: a ship sliding and shooting at a row of blobs. */
function BlasterScreen() {
  const sx = WTF_X + SCREEN.dx;
  return (
    <g clipPath="url(#arcade-wtf-screen)">
      <rect x={sx} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} fill="#000" />
      {[
        [6, 12],
        [22, 30],
        [40, 8],
        [58, 26],
        [12, 40],
        [50, 46],
      ].map(([dx, dy]) => (
        <rect
          key={`${dx}${dy}`}
          x={sx + dx}
          y={SCREEN.y + dy}
          width="1.5"
          height="1.5"
          fill="#fff"
        />
      ))}
      <text x={sx + 3} y={SCREEN.y + 8} fontFamily={PIXEL} fontSize="6" fill="#fff">
        1UP 0420
      </text>
      <g className="arcade-invaders">
        {[0, 1, 2, 3].map((i) => (
          <g key={i} className={i === 2 ? 'arcade-hit' : undefined}>
            <rect x={sx + 12 + i * 13} y={SCREEN.y + 14} width="8" height="6" fill="#8a5a2a" />
            <rect x={sx + 12 + i * 13} y={SCREEN.y + 12} width="2" height="2" fill="#8a5a2a" />
            <rect x={sx + 18 + i * 13} y={SCREEN.y + 12} width="2" height="2" fill="#8a5a2a" />
          </g>
        ))}
      </g>
      <g className="arcade-ship">
        <rect
          className="arcade-shot"
          x={sx + 33}
          y={SCREEN.y + 40}
          width="2"
          height="5"
          fill="#ffe14d"
        />
        <polygon
          points={`${sx + 34},${SCREEN.y + 44} ${sx + 40},${SCREEN.y + 54} ${sx + 28},${SCREEN.y + 54}`}
          fill="#2fbf4a"
        />
        <rect x={sx + 32} y={SCREEN.y + 50} width="4" height="3" fill="#ffc72c" />
      </g>
    </g>
  );
}

function Fish({
  x,
  y,
  fill,
  flip = false,
}: {
  x: number;
  y: number;
  fill: string;
  flip?: boolean;
}) {
  const d = flip ? -1 : 1;
  return (
    <g>
      <ellipse cx={x} cy={y} rx="6" ry="3.6" fill={fill} />
      <polygon
        points={`${x - d * 5},${y} ${x - d * 10},${y - 4} ${x - d * 10},${y + 4}`}
        fill={fill}
      />
      <circle cx={x + d * 3} cy={y - 1} r="0.9" fill="#000" />
    </g>
  );
}

/** POPFishies, playing itself: fish swimming by, bubbles, the occasional POP. */
function FishiesScreen() {
  const sx = POP_X + SCREEN.dx;
  const y = SCREEN.y;
  return (
    <g clipPath="url(#arcade-pop-screen)">
      <rect x={sx} y={y} width={SCREEN.w} height={SCREEN.h} fill="url(#arcade-water)" />
      <g className="arcade-fish arcade-fish-a">
        <Fish x={sx - 12} y={y + 18} fill="#ff8a2a" />
      </g>
      <g className="arcade-fish arcade-fish-b">
        <Fish x={sx + SCREEN.w + 12} y={y + 34} fill="#ff4ad0" flip />
      </g>
      <g className="arcade-fish arcade-fish-c">
        <Fish x={sx - 12} y={y + 46} fill="#ffe14d" />
      </g>
      {[10, 30, 52].map((dx, i) => (
        <circle
          key={dx}
          className="arcade-bubble"
          style={{ animationDelay: `${i * -0.9}s` }}
          cx={sx + dx}
          cy={y + SCREEN.h}
          r="1.8"
          fill="none"
          stroke="#cfffff"
          strokeWidth="0.8"
        />
      ))}
      <text
        className="arcade-pop"
        x={sx + 44}
        y={y + 22}
        textAnchor="middle"
        fontFamily="Impact, 'Arial Black', sans-serif"
        fontSize="11"
        fill="#fff"
        stroke="#ff2a6a"
        strokeWidth="0.8"
      >
        POP!
      </text>
      <rect x={sx} y={y + SCREEN.h - 4} width={SCREEN.w} height="4" fill="#e8c98a" />
    </g>
  );
}

function ScoreBoard({ pokes }: { pokes: number }) {
  const apfTop = pokes > 0 && pokes % 3 === 0;
  const rows = [
    ...(apfTop ? [['APF', '999999']] : []),
    ['BAM', '031337'],
    ['BAM', '024601'],
    ['BAM', '019980'],
    ['BAM', '012345'],
    ...(apfTop ? [] : [['APF', '000001']]),
    ...(pokes >= 2 ? [['YOU', '000000']] : []),
  ];
  return (
    <g>
      <rect x="106" y="64" width="104" height="156" rx="4" fill="#0a0620" {...line} />
      <rect x="112" y="70" width="92" height="144" fill="none" stroke="#3af2ff" strokeWidth="1.5" />
      <text
        x="158"
        y="88"
        textAnchor="middle"
        fontFamily={PIXEL}
        fontSize="10"
        fontWeight="bold"
        fill="#ff4ad0"
      >
        HIGH SCORES
      </text>
      {rows.map(([name, score], i) => (
        <text
          key={`${name}${i}`}
          className={name === 'YOU' || (apfTop && i === 0) ? 'arcade-new-score' : undefined}
          x="119"
          y={108 + i * 16}
          fontFamily={PIXEL}
          fontSize="9.5"
          textLength="80"
          lengthAdjust="spacingAndGlyphs"
          fontWeight="bold"
          fill={name === 'APF' ? '#ff6a3a' : name === 'YOU' ? '#ffe14d' : '#cfffff'}
          xmlSpace="preserve"
        >
          {`${i + 1}. ${name} ${score}`}
        </text>
      ))}
    </g>
  );
}

function ChangeMachine({ pokes }: { pokes: number }) {
  const tokens = Math.min(pokes, 2);
  const out = pokes >= 3;
  return (
    <g>
      <rect x="112" y="268" width="88" height="142" rx="3" fill="#7a7f88" {...line} />
      <rect x="120" y="278" width="72" height="22" fill="#1d1d1d" {...thin} />
      <text
        x="156"
        y="294"
        textAnchor="middle"
        fontFamily={PIXEL}
        fontSize="12"
        fontWeight="bold"
        fill="#3af2ff"
      >
        CHANGE
      </text>
      <rect x="128" y="312" width="38" height="24" fill="#5a5f68" {...thin} />
      <rect x="134" y="320" width="26" height="4" fill="#111" />
      <circle cx="182" cy="324" r="7" fill={out ? '#ff2a2a' : '#3a3a3a'} {...thin} />
      <text
        x="182"
        y="344"
        textAnchor="middle"
        fontFamily={PIXEL}
        fontSize="7"
        fontWeight="bold"
        fill={out ? '#ff2a2a' : '#2a2a2a'}
      >
        OUT
      </text>
      {/* The tray, with whatever it gave you */}
      <path d="M126 372 L186 372 L180 396 L132 396 Z" fill="#3a3f48" {...thin} />
      {Array.from({ length: tokens }, (_, i) => (
        <ellipse
          key={i}
          className="arcade-token"
          cx={146 + i * 18}
          cy={390}
          rx="7"
          ry="3.5"
          fill="#e0b450"
          stroke="#8a6a2a"
          strokeWidth="1"
        />
      ))}
      <rect x="110" y="404" width="92" height="10" fill="#4a4f58" {...thin} />
    </g>
  );
}

const PLUSH = [
  [492, 312, '#ff4ad0'],
  [508, 318, '#3af2ff'],
  [526, 310, '#ffe14d'],
  [544, 318, '#8a5aff'],
  [562, 312, '#2fbf4a'],
  [500, 300, '#ff8a2a'],
  [536, 298, '#ff4a5a'],
  [554, 300, '#3af2ff'],
  [518, 296, '#8a5aff'],
] as const;

function ClawMachine() {
  return (
    <g>
      <ellipse cx="530" cy={FLOOR + 10} rx="64" ry="10" fill="#ff4ad0" opacity="0.2" />
      <rect x="470" y="150" width="120" height="270" rx="4" fill="#c2186b" {...line} />
      <rect x="474" y="152" width="112" height="22" fill="#ff4ad0" {...thin} />
      <text
        x="530"
        y="168"
        textAnchor="middle"
        fontFamily="Impact, 'Arial Black', sans-serif"
        fontSize="13"
        textLength="96"
        lengthAdjust="spacingAndGlyphs"
        fill={INK}
      >
        SKILL TESTER
      </text>
      <rect x="480" y="180" width="100" height="148" fill="#1a1030" {...line} strokeWidth={2} />
      {PLUSH.map(([x, y, fill]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r="9" fill={fill} {...thin} />
          <circle cx={x - 3} cy={y - 2} r="1.2" fill={INK} />
          <circle cx={x + 3} cy={y - 2} r="1.2" fill={INK} />
        </g>
      ))}
      <rect x="480" y="320" width="100" height="8" fill="#2a1a40" />
      <line x1="480" y1="186" x2="580" y2="186" stroke="#8a8f98" strokeWidth="4" />
      {/* Lower cabinet: prize chute and a joystick */}
      <polygon points="466,334 594,334 590,354 470,354" fill="#ff4ad0" {...line} />
      <line x1="500" y1="344" x2="498" y2="328" stroke="#222" strokeWidth="3" />
      <circle cx="498" cy="326" r="5" fill="#ffe14d" {...thin} />
      <rect x="540" y="364" width="34" height="30" fill="#1a1030" {...thin} />
      <rect x="466" y="410" width="128" height="12" fill="#111" {...thin} />
    </g>
  );
}

export default function ArcadeArt({ pokes }: { pokes: Pokes }) {
  return (
    <>
      <defs>
        <pattern id="arcade-carpet" width="60" height="40" patternUnits="userSpaceOnUse">
          <rect width="60" height="40" fill="#120a24" />
          <path d="M4 8 q4 -6 8 0 t8 0" fill="none" stroke="#ff4ad0" strokeWidth="2" />
          <polygon points="38,6 46,6 42,13" fill="#3af2ff" />
          <circle cx="52" cy="28" r="3" fill="#ffe14d" />
          <path d="M14 30 l6 -6 l6 6" fill="none" stroke="#2fbf4a" strokeWidth="2" />
          <rect x="32" y="26" width="5" height="5" fill="#8a5aff" transform="rotate(20 34 28)" />
        </pattern>
        <pattern id="arcade-wall" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="#0b0618" />
          <path d="M0 48 L48 0" stroke="#1a1030" strokeWidth="6" />
        </pattern>
        <linearGradient id="arcade-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a8aff" />
          <stop offset="1" stopColor="#0a2a8a" />
        </linearGradient>
        <clipPath id="arcade-wtf-screen">
          <rect x={WTF_X + SCREEN.dx} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} />
        </clipPath>
        <clipPath id="arcade-pop-screen">
          <rect x={POP_X + SCREEN.dx} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} />
        </clipPath>
        <clipPath id="arcade-claw-glass">
          <rect x="480" y="180" width="100" height="148" />
        </clipPath>
        <filter id="arcade-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="21" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
        <filter id="arcade-glow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="arcade-dark" cx="50%" cy="50%" r="72%">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>

      <g filter="url(#arcade-ink)">
        <rect width="600" height="480" fill="url(#arcade-wall)" />
        <polygon
          points={`0,${FLOOR} 600,${FLOOR - 4} 600,480 0,480`}
          fill="url(#arcade-carpet)"
          {...line}
        />

        {/* Back to the hallway: its purple light around the door */}
        <rect x="18" y="196" width="84" height="216" fill="#5a3a8a" {...line} />
        <rect x="24" y="202" width="72" height="210" fill="#1d1230" {...line} strokeWidth={2} />
        <rect x="32" y="212" width="56" height="84" fill="none" stroke="#2f1f4a" strokeWidth="2" />
        <rect x="32" y="306" width="56" height="94" fill="none" stroke="#2f1f4a" strokeWidth="2" />
        <circle cx="84" cy="306" r="4.5" fill="#c9973f" {...thin} />
        <polygon points="24,412 96,412 104,420 16,420" fill="#8a5aff" opacity="0.5" />

        <ScoreBoard pokes={pokes.scores ?? 0} />
        <ChangeMachine pokes={pokes.change ?? 0} />
        <Cabinet x={WTF_X} body="#1a3a20" trim="#ffc72c" title="WTF BLASTER" />
        <Cabinet x={POP_X} body="#102a5a" trim="#3af2ff" title="POPFISHIES" />
        <ClawMachine />
      </g>

      {/* Neon */}
      <g filter="url(#arcade-glow)">
        <line x1="0" y1="12" x2="600" y2="12" stroke="#ff4ad0" strokeWidth="3" />
        <line x1="0" y1="20" x2="600" y2="20" stroke="#3af2ff" strokeWidth="2" />
        <g className="arcade-neon">
          <text
            x="340"
            y="92"
            textAnchor="middle"
            fontFamily="'Brush Script MT', 'Comic Sans MS', cursive"
            fontStyle="italic"
            fontWeight="bold"
            fontSize="46"
            fill="none"
            stroke="#ff4ad0"
            strokeWidth="2.5"
          >
            Arcade
          </text>
        </g>
        <text
          x="60"
          y="186"
          textAnchor="middle"
          fontFamily={PIXEL}
          fontSize="13"
          fontWeight="bold"
          fill="#8a5aff"
        >
          ← HALLWAY
        </text>
      </g>

      {/* Moving parts */}
      <BlasterScreen />
      <FishiesScreen />
      <CoinLights x={WTF_X} />
      <CoinLights x={POP_X} />

      <g clipPath="url(#arcade-claw-glass)">
        {/* Attract mode: now and then the claw drops by itself. The cord stretches. */}
        <line
          className="arcade-cord arcade-cord-drop"
          x1="530"
          y1="186"
          x2="530"
          y2="206"
          stroke="#cfcfcf"
          strokeWidth="1.5"
        />
        <g className="arcade-claw arcade-claw-drop">
          <rect x="522" y="204" width="16" height="7" fill="#8a8f98" {...thin} />
          <path
            d="M524 211 L518 224 L522 228 M536 211 L542 224 L538 228"
            fill="none"
            stroke="#8a8f98"
            strokeWidth="3"
          />
        </g>
      </g>
      <rect width="600" height="480" fill="url(#arcade-dark)" pointerEvents="none" />
    </>
  );
}
