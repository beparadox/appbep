import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { START } from './rooms';
import ExteriorArt from './scenes/ExteriorArt';
import type { Pokes } from './scenes';
import { play, unlockAudio } from './sound';
import { setSound } from './state';
import './funhouse.css';
import './scenes.css';

const W = 600;
const H = 480;
const ZOOM_MS = 450;

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
}
const box = ({ x, y, w, h }: Spot) => ({
  left: `${(x / W) * 100}%`,
  top: `${(y / H) * 100}%`,
  width: `${(w / W) * 100}%`,
  height: `${(h / H) * 100}%`,
});

const FRONT_DOOR: Spot = { x: 266, y: 314, w: 68, h: 92 };
const CELLAR: Spot = { x: 172, y: 372, w: 78, h: 50 };
const SIGNPOST: Spot = { x: 12, y: 406, w: 100, h: 70 };

/** Things to poke out front: [counter, name, where, what it says each time]. */
const PROPS: [string, string, Spot, string[]][] = [
  [
    'curtain',
    'An upstairs window',
    { x: 364, y: 214, w: 62, h: 62 },
    [
      'The curtain twitches. Somebody up there is watching you. He looks annoyed already.',
      'Nobody there now. The curtain is still swinging.',
    ],
  ],
  [
    'lantern',
    'The porch lantern',
    { x: 352, y: 310, w: 48, h: 50 },
    [
      'You switch the lantern off. It switches itself back on.',
      'A moth has been circling it since 1891. It is not tired.',
    ],
  ],
  [
    'mailbox',
    'The mailbox',
    { x: 378, y: 404, w: 56, h: 70 },
    [
      'Letters addressed to "Whoever is building this house." Every one of them says STOP.',
      'A postcard from the attic: "Wish you were up here."',
      'A catalog of doors. Several pages are dog-eared.',
    ],
  ],
];

/**
 * The funhouse from outside: "Are you sure?" The front door goes in with sound,
 * the cellar hatch goes in quietly. The click that enters also unlocks sound
 * (browsers require one).
 */
export default function Entrance() {
  const navigate = useNavigate();
  const [zoomTo, setZoomTo] = useState<string | null>(null);
  const [pokes, setPokes] = useState<Pokes>({});
  const [msg, setMsg] = useState<string | null>(null);

  function enter(withSound: boolean, at: Spot) {
    if (withSound) unlockAudio();
    setSound(withSound);
    play('jingle', withSound);
    const go = () => navigate(`/funhouse/${START}`);
    if (reducedMotion()) return go();
    setZoomTo(`${((at.x + at.w / 2) / W) * 100}% ${((at.y + at.h / 2) / H) * 100}%`);
    setTimeout(go, ZOOM_MS);
  }

  function poke(id: string, says: string[]) {
    const n = (pokes[id] ?? 0) + 1;
    setPokes({ ...pokes, [id]: n });
    setMsg(says[(n - 1) % says.length]);
  }

  return (
    <main className="funhouse entrance">
      <title>Enter at your own risk</title>
      <meta name="robots" content="noindex" />
      <h1 className="blink">ENTER AT YOUR OWN RISK</h1>
      <p className="sr-only">Beyond this point:</p>
      <ul className="sr-only">
        <li>old websites, not all of them well</li>
        <li>doors that lie</li>
        <li>things that jump out</li>
        <li>sounds (if you let them)</li>
      </ul>

      <div className="scene" style={{ aspectRatio: `${W} / ${H}` }}>
        <div
          className={`scene-inner${zoomTo ? ' scene-leaving' : ''}`}
          style={{ transformOrigin: zoomTo ?? undefined }}
        >
          <svg className="scene-art" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <ExteriorArt pokes={pokes} />
          </svg>

          <button
            type="button"
            className="hotspot"
            style={box(FRONT_DOOR)}
            onClick={() => enter(true, FRONT_DOOR)}
          >
            <span className="hotspot-label hotspot-label-below">🔊 Enter</span>
          </button>
          <button
            type="button"
            className="hotspot"
            style={box(CELLAR)}
            onClick={() => enter(false, CELLAR)}
          >
            <span className="hotspot-label hotspot-label-below hotspot-label-end">
              🔇 Enter quietly
            </span>
          </button>
          <Link className="hotspot" style={box(SIGNPOST)} to="/">
            <span className="hotspot-label hotspot-label-above hotspot-label-start">
              chicken out
            </span>
          </Link>
          {PROPS.map(([id, name, at, says]) => (
            <button
              key={id}
              type="button"
              className="hotspot hotspot-prop"
              style={box(at)}
              onClick={() => poke(id, says)}
            >
              <span className="hotspot-label hotspot-label-above">{name}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="wall-msg" role="status">
        {msg}
      </p>
    </main>
  );
}
