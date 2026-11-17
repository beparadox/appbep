import { useEffect, useState } from 'react';
import type { PhotoSlide } from './types';

/** How long each photo shows in the flipbook. */
export const FLIP_MS = 330;

interface Props {
  title: string;
  slides: PhotoSlide[];
  base: string;
  onBack: () => void;
}

/** The bonus gallery: a grid of photos; tap one to see it big. "Flipbook" runs through them fast. */
export default function Gallery({ title, slides, base, onBack }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const [flipping, setFlipping] = useState(false);

  // Flipbook: a third of a second each, once through.
  useEffect(() => {
    if (!flipping || open == null) return;
    const t = setTimeout(() => {
      if (open + 1 < slides.length) setOpen(open + 1);
      else setFlipping(false);
    }, FLIP_MS);
    return () => clearTimeout(t);
  }, [flipping, open, slides.length]);

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
            <button type="button" onClick={() => setOpen(n)} aria-label={`Photo ${n + 1}`}>
              <img src={base + s.src} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      {open != null && slides[open] && (
        <div className="bd-lightbox" onClick={() => setOpen(null)}>
          <img src={base + slides[open].src} alt="" />
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
