import { useEffect, useState } from 'react';
import { FLIP_MS } from './Gallery';
import type { PhotoSlide } from './types';

const INTRO_MS = 5000;
const HOLD_MS = 1200;

interface Props {
  title: string;
  slides: PhotoSlide[];
  base: string;
  onDone: () => void;
}

/**
 * The bonus photos played by themselves after the show: a title card with the bonus
 * link's words, then the photos flipbook-fast, then onDone.
 */
export default function SelfieReel({ title, slides, base, onDone }: Props) {
  /** -1 while the title card shows, then the photo showing. */
  const [at, setAt] = useState(-1);

  // Have every photo loaded by the time the flipping starts.
  useEffect(() => {
    for (const s of slides) new Image().src = base + s.src;
  }, [slides, base]);

  useEffect(() => {
    const last = at === slides.length - 1;
    const wait = at < 0 ? INTRO_MS : last ? HOLD_MS : FLIP_MS;
    const t = setTimeout(() => (last ? onDone() : setAt(at + 1)), wait);
    return () => clearTimeout(t);
  }, [at, slides.length, onDone]);

  const slide = at >= 0 ? slides[at] : null;
  return (
    <div className="bd-show bd-reel">
      {slide ? (
        <div className="bd-slide">
          <img className="bd-slide-blur" src={base + slide.src} alt="" />
          <img className="bd-reel-photo" src={base + slide.src} alt="" />
        </div>
      ) : (
        <div className="bd-reel-intro">
          <span className="bd-reel-emoji" aria-hidden="true">
            🤳
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
