import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import ExhibitCard from '../exhibits/ExhibitCard';
import { exhibit } from '../exhibits/registry';
import { play, unlockAudio } from '../funhouse/sound';
import { setSound, useFunhouse } from '../funhouse/state';
import { draw } from './draw';
import { H, TOKENS, W, newGame, step, type Controls, type Game, type GameEvent } from './engine';
import '../funhouse/funhouse.css';
import './skilltester.css';

const BEST_KEY = 'appbep-skilltester-best';

const MISSES = [
  'It grabs nothing, and looks pleased with itself anyway.',
  'Nothing. The claw seems to think that went well.',
  'It closes on thin air, very firmly.',
];
const NUDGES = ['A finger shoves it aside. Rude.', 'You knocked it. It rolls away, offended.'];
const SLIPS = [
  'Almost. Almost is the whole business model.',
  'It was holding it. Then it remembered it was a claw machine.',
  'So close the plush could feel the chute.',
];

function verdict(won: number): string {
  if (won === 0) return 'SKILL TESTER: 1. You: 0. Nobody has passed.';
  if (won === 1) return 'You passed the SKILL TESTER. Someone will have to update the sticker.';
  if (won < 4) return 'The machine is quietly reviewing its settings.';
  return 'The machine has called its manager.';
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(n: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* storage unavailable: the best lasts for the visit */
  }
}

interface Hud {
  phase: Game['phase'];
  tokens: number;
  seconds: number;
  won: string[];
}

const hudOf = (g: Game): Hud => ({
  phase: g.phase,
  tokens: g.tokens,
  seconds: Math.ceil(g.aimLeft),
  won: g.won.map((p) => p.kind.name),
});

/** SKILL TESTER: the claw machine from the arcade, playable. Game rules in engine.ts. */
export default function SkillTester() {
  const { sound } = useFunhouse();
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const controls = useRef<Controls>({ left: false, right: false, drop: false });
  const [hud, setHud] = useState<Hud | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [best, setBest] = useState(loadBest);
  const count = useRef(0);

  // The game loop: step, draw, and report anything that happened.
  useEffect(() => {
    const el = canvas.current;
    const c = el?.getContext('2d');
    if (!el || !c) return;
    const preview = newGame();
    let raf = 0;
    let last = performance.now();
    let shown = '';

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = game.current;
      if (g) {
        step(g, controls.current, dt);
        controls.current.drop = false;
        for (const e of g.events) react(e, g);
        g.events = [];
        const next = hudOf(g);
        const key = JSON.stringify(next);
        if (key !== shown) {
          shown = key;
          setHud(next);
        }
      }
      fit(el!, c!);
      draw(c!, g ?? preview, now / 1000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  function react(e: GameEvent, g: Game) {
    const s = soundRef.current;
    const pick = (xs: string[]) => xs[count.current++ % xs.length];
    switch (e.type) {
      case 'drop':
        setMessage(null);
        play('whirr', s);
        break;
      case 'grab':
        play('clink', s);
        setMessage(e.grip > 0.75 ? 'Got it. Firmly, for once.' : 'Got it. Sort of.');
        break;
      case 'miss':
        play('clink', s);
        setMessage(pick(e.nudged ? NUDGES : MISSES));
        break;
      case 'slip':
        play('sad', s);
        setMessage(pick(SLIPS));
        break;
      case 'win':
        play('prize', s);
        setMessage(`You won ${e.prize.kind.name}`);
        break;
      case 'over':
        setMessage(verdict(g.won.length));
        if (g.won.length > loadBest()) {
          saveBest(g.won.length);
          setBest(g.won.length);
        }
        break;
    }
  }

  function start() {
    unlockAudio();
    game.current = newGame();
    setHud(hudOf(game.current));
    setMessage('Arrows (or the buttons) to aim. Space to drop. 15 seconds a go.');
    play('jingle', sound);
  }

  function toggleSound() {
    if (!sound) unlockAudio();
    setSound(!sound);
  }

  // Keyboard: arrows or A/D to move, space / down / enter to drop.
  useEffect(() => {
    const keys: Record<string, keyof Controls> = {
      ArrowLeft: 'left',
      a: 'left',
      ArrowRight: 'right',
      d: 'right',
      ' ': 'drop',
      ArrowDown: 'drop',
      Enter: 'drop',
    };
    function handle(down: boolean) {
      return (ev: KeyboardEvent) => {
        const k = keys[ev.key];
        if (!k || !game.current || game.current.phase === 'over') return;
        if ((ev.target as HTMLElement).closest('a, button, summary')) {
          if (k === 'drop') return; // let Enter/space press the focused thing
        }
        ev.preventDefault();
        if (k === 'drop') {
          if (down && !ev.repeat) controls.current.drop = true;
        } else controls.current[k] = down;
      };
    }
    const kd = handle(true);
    const ku = handle(false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  /** A button you hold down (for touch screens), setting one control while held. */
  function hold(k: 'left' | 'right') {
    const set = (v: boolean) => () => {
      controls.current[k] = v;
    };
    return {
      onPointerDown: (ev: PointerEvent<HTMLButtonElement>) => {
        ev.currentTarget.setPointerCapture(ev.pointerId);
        controls.current[k] = true;
      },
      onPointerUp: set(false),
      onPointerCancel: set(false),
      onLostPointerCapture: set(false),
      onContextMenu: (ev: { preventDefault(): void }) => ev.preventDefault(),
    };
  }

  const playing = hud && hud.phase !== 'over';
  const aiming = hud?.phase === 'aim';

  return (
    <main className="funhouse room-arcade skilltester">
      <title>SKILL TESTER · the funhouse</title>
      <meta name="robots" content="noindex" />
      <nav className="hud" aria-label="Funhouse controls">
        <button type="button" onClick={toggleSound} aria-pressed={sound}>
          {sound ? '🔊 sound' : '🔇 muted'}
        </button>
        <Link to="/funhouse/arcade">🕹 back to the arcade</Link>
      </nav>

      <h1 className="room-name">SKILL TESTER</h1>

      <div className="st-cabinet">
        <div className="st-glass">
          <canvas
            ref={canvas}
            width={W}
            height={H}
            role="img"
            aria-label="Inside the claw machine: a claw on a rail above a pile of plush toys, and a prize chute in the corner."
          />
          {!playing && (
            <div className="st-overlay">
              {hud?.phase === 'over' && (
                <p className="st-score">
                  {hud.won.length} {hud.won.length === 1 ? 'prize' : 'prizes'}
                  <small>your best: {best}</small>
                </p>
              )}
              <button type="button" className="st-coin" onClick={start} autoFocus>
                {hud ? 'PLAY AGAIN' : 'INSERT COIN'}
                <small>(no coin needed)</small>
              </button>
            </div>
          )}
        </div>

        <div className="st-readout" aria-live="off">
          <span>
            TOKENS{' '}
            <span className="st-tokens" aria-label={`${hud?.tokens ?? TOKENS} left`}>
              {'●'.repeat(hud?.tokens ?? TOKENS)}
              {'○'.repeat(TOKENS - (hud?.tokens ?? TOKENS))}
            </span>
          </span>
          <span className={aiming && hud.seconds <= 5 ? 'st-hurry' : undefined}>
            TIME {aiming ? String(hud.seconds).padStart(2, '0') : '--'}
          </span>
          <span>PRIZES {hud?.won.length ?? 0}</span>
        </div>

        <div className="st-controls">
          <button type="button" aria-label="Move left" disabled={!aiming} {...hold('left')}>
            ◀
          </button>
          <button
            type="button"
            className="st-drop"
            disabled={!aiming}
            onClick={() => (controls.current.drop = true)}
          >
            DROP
          </button>
          <button type="button" aria-label="Move right" disabled={!aiming} {...hold('right')}>
            ▶
          </button>
        </div>
      </div>

      <p className="st-message" aria-live="polite">
        {message ?? ' '}
      </p>

      {hud && hud.won.length > 0 && (
        <section className="st-shelf" aria-label="Your prizes">
          <h2>Your prizes</h2>
          <ul>
            {hud.won.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="room-exhibits">
        <ExhibitCard exhibit={exhibit('skilltester')} variant="placard" />
      </div>
    </main>
  );
}

/** Keep the canvas sharp: match its pixel size to how big it's shown. */
function fit(el: HTMLCanvasElement, c: CanvasRenderingContext2D): void {
  const scale = (el.clientWidth / W) * (window.devicePixelRatio || 1);
  const w = Math.round(W * scale);
  if (w > 0 && el.width !== w) {
    el.width = w;
    el.height = Math.round(H * scale);
  }
  c.setTransform(el.width / W, 0, 0, el.height / H, 0, 0);
}
