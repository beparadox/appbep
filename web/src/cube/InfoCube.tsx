import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  faceShowing,
  goTo,
  step,
  type Direction,
  type FaceId,
  type Orientation,
} from './orientation';
import './cube.css';

export type CubeFace = { id: FaceId; label: string; content: ReactNode; className?: string };

const DRAG_THRESHOLD = 40; // px before a drag counts as a rotation
const KEYS: Record<string, Direction> = {
  ArrowLeft: 'right', // arrow keys move the *view*: ← shows the face to the left
  ArrowRight: 'left',
  ArrowUp: 'down',
  ArrowDown: 'up',
};

/**
 * The big navigable cube. Rotate by dragging/swiping, arrow keys, or the face buttons.
 * Only the face toward the viewer is interactive; the rest are `inert`.
 */
export function InfoCube({ faces }: { faces: CubeFace[] }) {
  const [o, setO] = useState<Orientation>({ yaw: 0, pitch: 0 });
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Swiping the cube must not scroll the page. CSS touch-action covers most browsers, but some
  // mobile browsers still scroll vertically, so we also cancel the touch at its start (which stops
  // scrolling before it begins) and on every move. Links/buttons are skipped so taps still work.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      if (!(e.target as HTMLElement).closest('a,button')) e.preventDefault();
    };
    const onMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
    };
  }, []);
  const showing = faceShowing(o);
  const move = useCallback((d: Direction) => setO((cur) => step(cur, d)), []);

  const style = {
    '--yaw': `${o.yaw * 90}deg`,
    '--pitch': `${o.pitch * 90}deg`, // top (-1) => rotateX(-90deg)
  } as CSSProperties;

  return (
    <div className="info-cube">
      <div
        ref={stageRef}
        className="cube-stage"
        tabIndex={0}
        aria-label="About me, as a cube. Use arrow keys, drag, or the buttons below to turn it."
        onKeyDown={(e) => {
          const d = KEYS[e.key];
          if (d) {
            e.preventDefault();
            move(d);
          }
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('a,button')) return; // let links work
          drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          const s = drag.current;
          drag.current = null;
          if (!s || s.id !== e.pointerId) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_THRESHOLD) return;
          if (Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 'left' : 'right');
          else move(dy < 0 ? 'up' : 'down');
        }}
        onPointerCancel={() => (drag.current = null)}
      >
        <div className="cube-tilt">
          <div className="cube" style={style}>
            {faces.map((f) => (
              <section
                key={f.id}
                id={`face-${f.id}`}
                role="tabpanel"
                aria-label={f.label}
                className={`face face-${f.id} ${f.className ?? ''}`}
                inert={f.id !== showing}
              >
                <div className="face-inner">{f.content}</div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <nav className="cube-tabs" role="tablist" aria-label="Cube faces">
        {faces.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.id === showing}
            aria-controls={`face-${f.id}`}
            className={f.id === showing ? 'active' : ''}
            onClick={() => setO((cur) => goTo(cur, f.id))}
          >
            {f.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export type SpinImages = Partial<Record<FaceId, { src: string; alt: string; className?: string }>>;

/** Small decorative cube that rotates on its own; optionally shows an image on some faces. */
export function SpinCube({
  className = '',
  reverse = false,
  images = {},
}: {
  className?: string;
  reverse?: boolean;
  images?: SpinImages;
}) {
  const ids: FaceId[] = ['front', 'right', 'back', 'left', 'top', 'bottom'];
  return (
    <div className={`spin-stage ${className}`} aria-hidden="true">
      <div className={`spin-cube ${reverse ? 'reverse' : ''}`}>
        {ids.map((f) => {
          const img = images[f];
          return (
            <div key={f} className={`spin-face face-${f} ${img ? 'has-img' : ''}`}>
              {img && <img src={img.src} alt="" className={img.className} draggable={false} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
