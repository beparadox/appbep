import { useEffect, useState } from 'react';
import type { Music } from './music';
import type { Slide } from './types';

/** How long each photo shows in the flipbook, unless the card says otherwise. */
export const FLIP_MS = 330;

interface Props {
  title: string;
  slides: Slide[];
  base: string;
  /** Steps aside while a clip with sound plays. */
  music?: Music | null;
  /** How long each photo shows in the flipbook. */
  flipMs?: number;
  onBack: () => void;
}

/**
 * The bonus gallery: a grid of photos and clips; tap one to see it big (a clip plays).
 * "Flipbook" runs through them fast, waiting for each clip to finish.
 */
export default function Gallery({ title, slides, base, music, flipMs = FLIP_MS, onBack }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const [flipping, setFlipping] = useState(false);
  const shown = open == null ? null : slides[open];

  // The music steps aside while a clip with sound is open.
  const loud = shown?.type === 'video' && shown.sound;
  useEffect(() => {
    if (!loud) return;
    music?.duck(true);
    return () => music?.duck(false);
  }, [loud, music]);

  function clipEnded() {
    if (!flipping || open == null) return;
    if (open + 1 < slides.length) setOpen(open + 1);
    else setFlipping(false);
  }

  // Flipbook: a third of a second each, once through.
  useEffect(() => {
    if (!flipping || open == null || slides[open]?.type === 'video') return;
    const t = setTimeout(() => {
      if (open + 1 < slides.length) setOpen(open + 1);
      else setFlipping(false);
    }, flipMs);
    return () => clearTimeout(t);
  }, [flipping, open, slides, flipMs]);

  useEffect(() => {
    if (open == null) return;
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight')
        setOpen((n) => (n == null ? n : Math.min(slides.length - 1, n + 1)));
      if (e.key === 'ArrowLeft') setOpen((n) => (n == null ? n : Math.max(0, n - 1)));
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, slides.length]);

  return (
    <section className="bd-gallery">
      <button type="button" className="bd-pill bd-back" onClick={onBack}>
        ← Back to the card
      </button>
      <h2>{title}</h2>
      <button
        type="button"
        className="bd-pill bd-flip"
        onClick={() => {
          setOpen(0);
          setFlipping(true);
        }}
      >
        ▶ Flipbook
      </button>
      <ul className="bd-grid">
        {slides.map((s, n) => (
          <li key={s.src}>
            <button
              type="button"
              className={s.type === 'video' ? 'bd-grid-video' : undefined}
              onClick={() => setOpen(n)}
              aria-label={`${s.type === 'video' ? 'Video' : 'Photo'} ${n + 1}`}
            >
              <img src={base + (s.type === 'photo' ? s.src : s.poster)} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      {open != null && shown && (
        <div className="bd-lightbox" onClick={() => setOpen(null)}>
          {shown.type === 'photo' ? (
            <img src={base + shown.src} alt="" />
          ) : (
            <video
              key={shown.src}
              src={base + shown.src}
              poster={base + shown.poster}
              muted={!shown.sound}
              autoPlay
              playsInline
              controls
              onClick={(e) => e.stopPropagation()}
              onEnded={clipEnded}
            />
          )}
          <div className="bd-bar" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Back"
              disabled={open === 0}
              onClick={() => setOpen(open - 1)}
            >
              ◀
            </button>
            <span className="bd-count">
              {open + 1} / {slides.length}
            </span>
            <button
              type="button"
              aria-label="Next"
              disabled={open === slides.length - 1}
              onClick={() => setOpen(open + 1)}
            >
              ▶
            </button>
            <span className="bd-bar-gap" />
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setFlipping(false);
                setOpen(null);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
