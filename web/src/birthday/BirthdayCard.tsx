import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { useParams } from 'react-router-dom';
import { makeConfetti, type Confetti } from './confetti';
import Gallery from './Gallery';
import SelfieReel from './SelfieReel';
import { Music } from './music';
import Slideshow from './Slideshow';
import { cardBase, ordinal, validId, type CardData } from './types';
import './birthday.css';

type Stage = 'envelope' | 'opening' | 'hello' | 'show' | 'message' | 'bonus' | 'selfies';

/** After the show, the countdown to the selfies starts here. */
const COUNT_FROM = 5;

/**
 * A birthday card at /birthday/<id>. The card's words, photos and clips come from
 * /cards/<id>/ (made by scripts/card-picker), so nothing personal is in this code.
 *
 * Envelope → tap to open (the music starts) → the slideshow → the message, with balloons
 * dropping → the bonus photos as a flipbook → "Happy Birthday" with confetti and balloons
 * to pop. Closing the slideshow early goes straight to "Happy Birthday". The bonus photos
 * are also a gallery behind a link.
 */
export default function BirthdayCard() {
  const { id = '' } = useParams();
  const base = cardBase(id);
  const [card, setCard] = useState<CardData | null>(null);
  const [missing, setMissing] = useState(false);
  const [stage, setStage] = useState<Stage>('envelope');
  const [muted, setMuted] = useState(false);
  /** Bumped when the slideshow ends, to drop balloons from the ceiling. */
  const [drop, setDrop] = useState(0);
  /** The show just played to the end, so the selfies follow on by themselves. */
  const [ending, setEnding] = useState(false);
  const music = useRef<Music | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const confetti = useRef<Confetti | null>(null);

  useEffect(() => {
    if (!validId(id)) {
      setMissing(true);
      return;
    }
    let live = true;
    fetch(`${base}card.json`)
      .then((r) => (r.ok ? (r.json() as Promise<CardData>) : Promise.reject(new Error('missing'))))
      .then((data) => live && setCard(data))
      .catch(() => live && setMissing(true));
    return () => {
      live = false;
    };
  }, [id, base]);

  useEffect(() => {
    if (canvas.current) confetti.current = makeConfetti(canvas.current);
    return () => {
      confetti.current?.stop();
      music.current?.stop();
    };
  }, []);

  const celebrate = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    confetti.current?.burst(w * 0.2, h * 0.75, 70, 0.6);
    confetti.current?.burst(w * 0.8, h * 0.75, 70, 0.6);
  }, []);

  /** The tap that opens the envelope: everything that needs a tap to start, starts here. */
  function open() {
    if (!card || stage !== 'envelope') return;
    if (card.music) {
      music.current = new Music(base + card.music);
      music.current.start();
    }
    // One <video> for all the clips, started (and stopped) inside this tap so that
    // phones allow it to play with sound later.
    const v = document.createElement('video');
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    const first = card.slides.find((s) => s.type === 'video');
    if (first) {
      v.src = base + first.src;
      v.play().catch(() => {});
      v.pause();
    }
    video.current = v;
    setStage('opening');
    // Once the envelope has opened, straight into the slideshow (or the greeting, if
    // there's nothing to show).
    window.setTimeout(() => {
      if (card.slides.length > 0) setStage('show');
      else {
        setStage('hello');
        celebrate();
      }
    }, 1500);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    music.current?.setMuted(next);
  }

  function goTo(next: Stage) {
    setStage(next);
    setEnding(false);
    if (next === 'message' || next === 'hello') window.setTimeout(celebrate, 300);
    window.scrollTo(0, 0);
  }

  const finished = useCallback(() => {
    goTo('message');
    setDrop((d) => d + 1);
    setEnding(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const closeShow = useCallback(() => goTo('hello'), []); // eslint-disable-line react-hooks/exhaustive-deps

  /** The end of the show: after the message and a countdown, the selfies. */
  const startSelfies = useCallback(() => {
    setStage('selfies');
    setEnding(false);
    window.scrollTo(0, 0);
  }, []);

  const muteButton = card?.music ? (
    <button
      type="button"
      className="bd-mute"
      aria-pressed={muted}
      aria-label={muted ? 'Turn the music on' : 'Turn the music off'}
      onClick={toggleMute}
    >
      {muted ? '🔇' : '🎵'}
    </button>
  ) : null;

  const head = (
    <>
      <title>A birthday card for you 🎂</title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="theme-color" content="#1b1035" />
    </>
  );

  if (missing) {
    return (
      <main className="bd bd-center">
        {head}
        <p className="bd-lost">This card isn’t here. Check the link?</p>
      </main>
    );
  }

  const name = card?.name ?? '';
  return (
    <main className={`bd bd-stage-${stage}`}>
      {head}
      <div className="bd-sky" aria-hidden="true">
        {Array.from({ length: 14 }, (_, n) => (
          <span key={n} style={{ '--n': n } as CSSProperties} />
        ))}
      </div>

      {(stage === 'envelope' || stage === 'opening') && (
        <section className="bd-center">
          <button
            type="button"
            className={`bd-envelope${stage === 'opening' ? ' bd-open' : ''}`}
            onClick={open}
            disabled={!card}
            aria-label={card ? `Open your card, ${name}` : 'Loading your card'}
          >
            <span className="bd-env-back" />
            <span className="bd-letter">
              <span>Happy Birthday!</span>
            </span>
            <span className="bd-env-front">
              <span className="bd-to">{card ? `For ${name}` : '…'}</span>
            </span>
            <span className="bd-flap" />
            <span className="bd-seal">{card?.age ?? '♥'}</span>
          </button>
          <p className="bd-hint">{card ? 'Tap to open 💌' : 'Loading…'}</p>
        </section>
      )}

      {stage === 'hello' && card && (
        <section className="bd-hello">
          {muteButton && <div className="bd-corner">{muteButton}</div>}
          <Balloons onPop={(x, y) => confetti.current?.burst(x, y, 35, 2)} />
          <h1 className="bd-title">
            <span className="bd-happy">Happy</span>
            {card.age != null && <span className="bd-age">{ordinal(card.age)}</span>}
            <span className="bd-birthday">Birthday</span>
            <span className="bd-name">{name}</span>
          </h1>
          <div className="bd-actions">
            {card.slides.length > 0 && (
              <button type="button" className="bd-pill bd-primary" onClick={() => goTo('show')}>
                ▶ Watch your slideshow
              </button>
            )}
            {card.message.length > 0 && (
              <button type="button" className="bd-pill" onClick={() => goTo('message')}>
                💌 Read your message
              </button>
            )}
            {card.bonus && (
              <button type="button" className="bd-link" onClick={() => goTo('bonus')}>
                {card.bonus.link} →
              </button>
            )}
          </div>
          <p className="bd-hint">Pop the balloons 🎈</p>
        </section>
      )}

      {stage === 'show' && card && video.current && (
        <Slideshow
          slides={card.slides}
          base={base}
          photoSeconds={card.photoSeconds}
          music={music.current}
          video={video.current}
          extra={muteButton}
          onDone={finished}
          onClose={closeShow}
        />
      )}

      {stage === 'message' && card && (
        <section className="bd-center bd-message-stage">
          {muteButton && <div className="bd-corner">{muteButton}</div>}
          {drop > 0 && (
            <BalloonDrop key={drop} onPop={(x, y) => confetti.current?.burst(x, y, 35, 2)} />
          )}
          <article className="bd-paper">
            <h2>Dear {name},</h2>
            {card.message.map((p, n) => (
              <p key={n}>{p}</p>
            ))}
            {card.from && (
              <p className="bd-sign">
                Love,
                <br />
                {card.from}
              </p>
            )}
          </article>
          {card.musicCredit && <p className="bd-credit">{card.musicCredit}</p>}
          <div className="bd-actions">
            {card.slides.length > 0 && (
              <button type="button" className="bd-pill" onClick={() => goTo('show')}>
                ▶ Watch the slideshow again
              </button>
            )}
            <button type="button" className="bd-pill" onClick={() => goTo('hello')}>
              🎈 Back to the balloons
            </button>
            {card.bonus && ending && <Countdown from={COUNT_FROM} onDone={startSelfies} />}
            {card.bonus && (
              <button type="button" className="bd-link" onClick={() => goTo('bonus')}>
                {card.bonus.link} →
              </button>
            )}
          </div>
        </section>
      )}

      {stage === 'selfies' && card?.bonus && (
        <SelfieReel
          title={card.bonus.link}
          slides={card.bonus.slides}
          base={base}
          onDone={closeShow}
        />
      )}

      {stage === 'bonus' && card?.bonus && (
        <>
          {muteButton && <div className="bd-corner">{muteButton}</div>}
          <Gallery
            title={card.bonus.link}
            slides={card.bonus.slides}
            base={base}
            onBack={() => goTo('hello')}
          />
        </>
      )}

      <canvas ref={canvas} className="bd-confetti" aria-hidden="true" />
    </main>
  );
}

const BALLOON_COLORS = ['#ff5fa2', '#ffd166', '#4fd1c5', '#9b7bff', '#ff8a5b', '#7ee081'];

/** Balloons drifting up the screen. Tap one and it pops; another comes along later. */
function Balloons({ onPop }: { onPop: (x: number, y: number) => void }) {
  const [gen, setGen] = useState(() => BALLOON_COLORS.map(() => 0).concat([0, 0, 0]));
  const [popped, setPopped] = useState<Set<number>>(new Set());

  function pop(n: number, e: MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    onPop(r.left + r.width / 2, r.top + r.height / 3);
    popSound();
    setPopped((s) => new Set(s).add(n));
    window.setTimeout(() => {
      setPopped((s) => {
        const next = new Set(s);
        next.delete(n);
        return next;
      });
      setGen((g) => g.map((v, k) => (k === n ? v + 1 : v)));
    }, 4000);
  }

  return (
    <div className="bd-balloons">
      {gen.map((g, n) =>
        popped.has(n) ? null : (
          <button
            key={`${n}-${g}`}
            type="button"
            className="bd-balloon"
            aria-label="Pop a balloon"
            onClick={(e) => pop(n, e)}
            style={
              {
                '--x': `${((n * 37) % 90) + 3}%`,
                '--dur': `${9 + ((n * 7) % 6)}s`,
                '--delay': `${-((n * 1.7) % 9)}s`,
                '--sway': `${n % 2 ? 14 : -14}px`,
                '--c': BALLOON_COLORS[n % BALLOON_COLORS.length],
              } as CSSProperties
            }
          />
        ),
      )}
    </div>
  );
}

/** The end of the show: a ceiling's worth of balloons tumbling down past the message. */
function BalloonDrop({ onPop }: { onPop: (x: number, y: number) => void }) {
  const count = 26;
  const [gone, setGone] = useState<Set<number>>(new Set());
  const remove = (n: number) => setGone((s) => new Set(s).add(n));
  if (gone.size === count) return null;

  return (
    <div className="bd-balloons bd-drop">
      {Array.from({ length: count }, (_, n) =>
        gone.has(n) ? null : (
          <button
            key={n}
            type="button"
            className="bd-balloon"
            aria-label="Pop a balloon"
            onAnimationEnd={() => remove(n)}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onPop(r.left + r.width / 2, r.top + r.height / 3);
              popSound();
              remove(n);
            }}
            style={
              {
                '--x': `${((n * 41) % 96) - 2}%`,
                '--dur': `${4.5 + ((n * 13) % 7) * 0.4}s`,
                '--delay': `${((n * 0.37) % 2.6).toFixed(2)}s`,
                '--sway': `${(n % 2 ? 1 : -1) * (10 + ((n * 5) % 20))}px`,
                '--tilt': `${((n * 17) % 30) - 15}deg`,
                '--size': `${0.8 + ((n * 7) % 5) * 0.1}`,
                '--c': BALLOON_COLORS[n % BALLOON_COLORS.length],
              } as CSSProperties
            }
          />
        ),
      )}
    </div>
  );
}

/** 5… 4… 3… 2… 1…, one a second, each popping in; then onDone. */
function Countdown({ from, onDone }: { from: number; onDone: () => void }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    const t = setTimeout(() => (n > 1 ? setN(n - 1) : onDone()), 1000);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <div className="bd-countdown" aria-live="polite">
      <span key={n}>{n}</span>
    </div>
  );
}

let popCtx: AudioContext | null = null;
/** A short "pop": a burst of filtered noise. */
function popSound() {
  try {
    popCtx ??= new AudioContext();
    const ctx = popCtx;
    const len = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buf;
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    gain.gain.value = 0.6;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  } catch {
    /* no sound: still popped */
  }
}
