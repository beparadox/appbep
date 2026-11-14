import { useEffect, useState, type MouseEvent } from 'react';
import { exhibit, exhibitHref } from '../exhibits/registry';
import type { Door, Room } from './rooms';
import type { Hotspot, Pokes, Scene } from './scenes';
import './scenes.css';

const ZOOM_MS = 450;

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A room drawn as a picture. Its doors and exhibits are real buttons and links
 * laid over the drawing, each with a name tag, so they work by touch, mouse,
 * keyboard and screen reader. Going through a door zooms into it first.
 */
export default function SceneView({
  scene,
  room,
  onDoor,
  onSay,
}: {
  scene: Scene;
  room: Room;
  onDoor: (door: Door) => void;
  /** A prop has something to say (shown under the picture). */
  onSay: (message: string) => void;
}) {
  const [zoomTo, setZoomTo] = useState<string | null>(null);
  const [pokes, setPokes] = useState<Pokes>({});
  const { width, height, Art } = scene;

  // Back from an exhibit, desktop browsers restore this page from their back/forward
  // cache exactly as it was left: mid-zoom, scaled up and faded out. Put the room back.
  useEffect(() => {
    const restored = (e: PageTransitionEvent) => e.persisted && setZoomTo(null);
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);

  const box = (h: Hotspot) => ({
    left: `${(h.x / width) * 100}%`,
    top: `${(h.y / height) * 100}%`,
    width: `${(h.w / width) * 100}%`,
    height: `${(h.h / height) * 100}%`,
  });

  /** Zoom into a hotspot, then go. */
  function through(h: Hotspot, go: () => void) {
    if (reducedMotion()) return go();
    setZoomTo(`${((h.x + h.w / 2) / width) * 100}% ${((h.y + h.h / 2) / height) * 100}%`);
    setTimeout(go, ZOOM_MS);
  }

  function hotspot(h: Hotspot) {
    const tag = `hotspot-label hotspot-label-${h.label ?? 'below'}${h.align ? ` hotspot-label-${h.align}` : ''}`;

    if (h.kind === 'prop') {
      const poke = () => {
        const n = (pokes[h.poke] ?? 0) + 1;
        setPokes({ ...pokes, [h.poke]: n });
        onSay(h.says[(n - 1) % h.says.length]);
      };
      return (
        <button
          key={h.id}
          type="button"
          className="hotspot hotspot-prop"
          style={box(h)}
          onClick={poke}
        >
          <span className={tag}>{h.name}</span>
        </button>
      );
    }

    if (h.kind === 'door') {
      const door = room.doors.find((d) => d.label === h.id);
      if (!door) return null;
      const click = () => {
        if (!('wall' in door)) return through(h, () => onDoor(door));
        // A dead end counts as a poke (keyed by the door's label), so the art can react.
        setPokes((p) => ({ ...p, [h.id]: (p[h.id] ?? 0) + 1 }));
        onDoor(door);
      };
      return (
        <button key={h.id} type="button" className="hotspot" style={box(h)} onClick={click}>
          <span className={tag}>{door.label}</span>
        </button>
      );
    }

    const e = exhibit(h.id);
    const href = exhibitHref(e);
    if (!href) {
      return (
        <span key={h.id} className="hotspot hotspot-closed" style={box(h)}>
          <span className={tag}>{e.title} (coming soon)</span>
        </span>
      );
    }
    const enter = (ev: MouseEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return; // new tab etc.
      ev.preventDefault();
      through(h, () => window.location.assign(href));
    };
    return (
      <a key={h.id} className="hotspot" style={box(h)} href={href} onClick={enter}>
        <span className={tag}>{e.title}</span>
      </a>
    );
  }

  return (
    <div className="scene" style={{ aspectRatio: `${width} / ${height}` }}>
      <div
        className={`scene-inner${zoomTo ? ' scene-leaving' : ''}`}
        style={{ transformOrigin: zoomTo ?? undefined }}
      >
        <svg className="scene-art" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          <Art pokes={pokes} />
        </svg>
        {scene.hotspots.map(hotspot)}
      </div>
    </div>
  );
}
