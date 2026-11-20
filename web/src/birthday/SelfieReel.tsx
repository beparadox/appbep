import { useEffect, useRef, useState } from 'react';
import { FLIP_MS } from './Gallery';
import type { Music } from './music';
import type { Slide } from './types';

const INTRO_MS = 5000;
const HOLD_MS = 1200;

interface Props {
  title: string;
  /** Shown big above the title. */
  emoji?: string;
  slides: Slide[];
  base: string;
  /** The card's one <video> (see Slideshow); needed only if there are clips. */
  video?: HTMLVideoElement | null;
  music?: Music | null;
  /** How long each photo shows. */
  flipMs?: number;
  onDone: () => void;
}

/**
 * The bonus round, played by itself after the show: a title card, then the photos
 * flipbook-fast, then onDone. A clip plays through at its own speed, with its sound if it
 * has some (the music steps aside), then the flipping carries on.
 */
export default function SelfieReel({
  title,
  emoji = '🤳',
  slides,
  base,
  video,
  music,
  flipMs = FLIP_MS,
  onDone,
}: Props) {
  /** -1 while the title card shows, then the slide showing. */
  const [at, setAt] = useState(-1);
  const host = useRef<HTMLDivElement>(null);
  const slide = at >= 0 ? slides[at] : null;
  const last = at === slides.length - 1;
  const next = () => (last ? onDone() : setAt(at + 1));

  // Have every photo (and clip poster) loaded by the time the flipping starts.
  useEffect(() => {
    for (const s of slides) new Image().src = base + (s.type === 'photo' ? s.src : s.poster);
  }, [slides, base]);

  // Photos (and the title card) move on by time.
  useEffect(() => {
    if (slide?.type === 'video' && video) return;
    const wait = at < 0 ? INTRO_MS : last ? HOLD_MS : flipMs;
    const t = setTimeout(next, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per slide
  }, [at]);

  // A clip: put the shared <video> on stage and play it to the end.
  useEffect(() => {
    if (slide?.type !== 'video' || !video || !host.current) return;
    const v = video;
    host.current.append(v);
    v.className = 'bd-video';
    v.poster = base + slide.poster;
    v.src = base + slide.src;
    v.muted = !slide.sound;
    if (slide.sound) music?.duck(true);
    v.addEventListener('ended', next);
    v.play().catch(() => {
      // No sound allowed: play it silently rather than not at all.
      v.muted = true;
      music?.duck(false);
      void v.play().catch(next);
    });
    return () => {
      v.removeEventListener('ended', next);
      v.pause();
      v.remove();
      if (slide.sound) music?.duck(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per slide
  }, [at]);

  return (
    <div className="bd-show bd-reel">
      {slide ? (
        <div className="bd-slide">
          <img
            className="bd-slide-blur"
            src={base + (slide.type === 'photo' ? slide.src : slide.poster)}
            alt=""
          />
          {slide.type === 'photo' ? (
            <img className="bd-reel-photo" src={base + slide.src} alt="" />
          ) : (
            <div ref={host} className="bd-video-host" />
          )}
        </div>
      ) : (
        <div className="bd-reel-intro">
          <span className="bd-reel-emoji" aria-hidden="true">
            {emoji}
          </span>
          <h2>{title}</h2>
        </div>
      )}
      <button
        type="button"
        className="bd-pill bd-reel-skip"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        Skip →
      </button>
    </div>
  );
}
