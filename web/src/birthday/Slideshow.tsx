import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import type { Music } from './music';
import type { Slide } from './types';

interface Props {
  slides: Slide[];
  base: string;
  photoSeconds: number;
  music: Music | null;
  /**
   * One <video> element for every clip. It was started inside the tap that opened the
   * card, which is what lets phones play later clips with sound.
   */
  video: HTMLVideoElement;
  /** Extra buttons for the control bar (the music's mute). */
  extra?: ReactNode;
  onDone: () => void;
  onClose: () => void;
}

const FADE_MS = 700;
const CHROME_MS = 3000;

/**
 * Full-screen slideshow. Photos show for photoSeconds each with a slow zoom, cross-fading
 * into the next; video clips play to the end with their sound while the music steps
 * aside. Pause, back, forward; swipe or arrow keys too.
 */
export default function Slideshow({
  slides,
  base,
  photoSeconds,
  music,
  video,
  extra,
  onDone,
  onClose,
}: Props) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [tapForSound, setTapForSound] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const chromeTimer = useRef(0);
  const touchX = useRef<number | null>(null);
  const slide = slides[i];

  const go = useCallback(
    (n: number) => {
      if (n < 0) return;
      setPrev(i);
      setI(n);
    },
    [i],
  );

  /** Show the controls for a few seconds. */
  const wake = useCallback(() => {
    setChrome(true);
    clearTimeout(chromeTimer.current);
    chromeTimer.current = window.setTimeout(() => setChrome(false), CHROME_MS);
  }, []);
  useEffect(() => {
    wake();
    return () => clearTimeout(chromeTimer.current);
  }, [wake]);

  // Past the last slide: the end.
  useEffect(() => {
    if (i >= slides.length) onDone();
  }, [i, slides.length, onDone]);

  // The previous slide stays underneath until the new one has faded in.
  useEffect(() => {
    if (prev == null) return;
    const t = setTimeout(() => setPrev(null), FADE_MS + 50);
    return () => clearTimeout(t);
  }, [prev, i]);

  // Photos move on by themselves.
  useEffect(() => {
    if (slide?.type !== 'photo' || paused) return;
    const t = setTimeout(() => go(i + 1), photoSeconds * 1000);
    return () => clearTimeout(t);
  }, [slide, paused, i, photoSeconds, go]);

  // Load the next few photos ahead of time.
  useEffect(() => {
    for (const s of slides.slice(i + 1, i + 4)) {
      if (s.type === 'photo') new Image().src = base + s.src;
      else new Image().src = base + s.poster;
    }
  }, [i, slides, base]);

  // A video clip: put the shared <video> on stage and play it to the end.
  useEffect(() => {
    if (slide?.type !== 'video' || !host.current) return;
    const v = video;
    host.current.append(v);
    v.className = 'bd-video';
    v.poster = base + slide.poster;
    v.src = base + slide.src;
    v.muted = !slide.sound;
    if (slide.sound) music?.duck(true);
    const ended = () => go(i + 1);
    v.addEventListener('ended', ended);
    v.play().catch(() => {
      // The phone wouldn't play it with sound: play it silently, and offer the sound.
      if (!slide.sound) return;
      v.muted = true;
      music?.duck(false);
      setTapForSound(true);
      void v.play().catch(() => {});
    });
    return () => {
      v.removeEventListener('ended', ended);
      v.pause();
      v.remove();
      setTapForSound(false);
      if (slide.sound) music?.duck(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per slide
  }, [i]);

  // Pausing pauses the clip too.
  useEffect(() => {
    if (slide?.type !== 'video') return;
    if (paused) video.pause();
    else if (video.paused && !video.ended) void video.play().catch(() => {});
  }, [paused, slide, video]);

  // Keyboard: arrows, space, escape.
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(i + 1);
      else if (e.key === 'ArrowLeft') go(i - 1);
      else if (e.key === ' ') setPaused((p) => !p);
      else if (e.key === 'Escape') onClose();
      else return;
      e.preventDefault();
      wake();
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [i, go, onClose, wake]);

  function soundOn() {
    video.muted = false;
    music?.duck(true);
    setTapForSound(false);
    void video.play().catch(() => {});
  }

  function touchStart(e: TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function touchEnd(e: TouchEvent) {
    const start = touchX.current;
    const end = e.changedTouches[0]?.clientX;
    touchX.current = null;
    if (start == null || end == null) return;
    if (end - start < -50) go(i + 1);
    else if (end - start > 50) go(i - 1);
  }

  if (!slide) return <div className="bd-show" />;

  return (
    <div
      className={`bd-show${chrome ? '' : ' bd-chrome-hidden'}${paused ? ' bd-paused' : ''}`}
      onClick={() => (chrome ? setChrome(false) : wake())}
      onMouseMove={wake}
      onTouchStart={touchStart}
      onTouchEnd={touchEnd}
    >
      {prev != null && slides[prev] && (
        <SlideView key={`s${prev}`} slide={slides[prev]} base={base} seconds={photoSeconds} />
      )}
      <SlideView key={`s${i}`} slide={slide} base={base} seconds={photoSeconds} entering>
        {slide.type === 'video' && <div ref={host} className="bd-video-host" />}
      </SlideView>

      {tapForSound && (
        <button
          type="button"
          className="bd-pill bd-sound-tap"
          onClick={(e) => {
            e.stopPropagation();
            soundOn();
          }}
        >
          🔊 Tap for sound
        </button>
      )}

      <div className="bd-bar" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Back" onClick={() => go(i - 1)} disabled={i === 0}>
          ◀
        </button>
        <button
          type="button"
          aria-label={paused ? 'Play' : 'Pause'}
          onClick={() => {
            setPaused((p) => !p);
            wake();
          }}
        >
          {paused ? '▶' : '❚❚'}
        </button>
        <button type="button" aria-label="Next" onClick={() => go(i + 1)}>
          ▶▶
        </button>
        <span className="bd-count">
          {i + 1} / {slides.length}
        </span>
        <span className="bd-bar-gap" />
        {extra}
        <button type="button" aria-label="Close the slideshow" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="bd-progress" style={{ width: `${((i + 1) / slides.length) * 100}%` }} />
    </div>
  );
}

/** One slide: a blurred copy filling the screen behind the whole picture. */
function SlideView({
  slide,
  base,
  seconds,
  entering,
  children,
}: {
  slide: Slide;
  base: string;
  seconds: number;
  entering?: boolean;
  children?: ReactNode;
}) {
  const still = base + (slide.type === 'photo' ? slide.src : slide.poster);
  return (
    <div className={`bd-slide${entering ? ' bd-slide-in' : ''}`}>
      <img className="bd-slide-blur" src={still} alt="" />
      {slide.type === 'photo' ? (
        <img
          className="bd-slide-photo"
          src={still}
          alt=""
          style={{ animationDuration: `${seconds + 1}s` }}
        />
      ) : (
        children
      )}
    </div>
  );
}
