import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ExhibitCard from '../exhibits/ExhibitCard';
import { exhibit } from '../exhibits/registry';
import FloorPlan from './FloorPlan';
import { appearChance, enteredRoom, jumpOut, newStalker, wallChance, type Context } from './apf';
import JumpOut, { type JumpEdge } from './JumpOut';
import { ROOM_IDS, ROOMS, START, type Door } from './rooms';
import SceneView from './SceneView';
import { SCENES } from './scenes';
import { play, unlockAudio } from './sound';
import { markFound, setSound, useFunhouse } from './state';
import './funhouse.css';

const EDGES: JumpEdge[] = ['left', 'right', 'bottom'];
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** The Angry Packers Fan, following you from room to room (see apf.ts). Lasts for the page load. */
let stalker = newStalker();

export default function Room() {
  const { roomId = START } = useParams();
  const room = ROOMS[roomId];
  const scene = SCENES[roomId];
  const navigate = useNavigate();
  const note = (useLocation().state as { note?: string } | null)?.note;
  const { sound, found } = useFunhouse();
  const [wallMsg, setWallMsg] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [jump, setJump] = useState<{ edge: JumpEdge; line: string } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const visits = useRef(0);

  // Entering a room: remember it, creak, and now and then the APF is lurking.
  useEffect(() => {
    if (!room) return;
    markFound(room.id);
    setWallMsg(null);
    play('creak', sound);
    visits.current += 1;
    stalker = enteredRoom(stalker);
    if (Math.random() < appearChance(stalker, visits.current)) {
      const t = setTimeout(() => surprise({ room: room.id }), 600 + Math.random() * 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on room change
  }, [roomId]);

  function surprise(ctx: Context) {
    const { line, next } = jumpOut(stalker, ctx);
    stalker = next;
    setJump({ edge: pick(EDGES), line });
    play('boing', sound);
  }

  function open(door: Door) {
    if ('wall' in door) {
      play('thud', sound);
      setWallMsg(door.wall);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      if (Math.random() < wallChance(room.id, door.label)) {
        setTimeout(() => surprise({ room: room.id, wall: door.label }), 500);
      }
      return;
    }
    if ('random' in door) {
      const elsewhere = ROOM_IDS.filter((id) => id !== roomId);
      navigate(`/funhouse/${pick(elsewhere)}`, {
        state: { note: 'The floor tilts. You end up somewhere else entirely.' },
      });
      return;
    }
    navigate(`/funhouse/${door.to}`, { state: { note: door.note } });
  }

  function toggleSound() {
    if (!sound) unlockAudio();
    setSound(!sound);
  }

  if (!room) {
    return (
      <main className="funhouse room-closet">
        <h1>This room was demolished.</h1>
        <p>
          <Link to={`/funhouse/${START}`}>Find your way back to the foyer</Link>
        </p>
      </main>
    );
  }

  return (
    <main className={`funhouse room ${room.theme}${shaking ? ' shake' : ''}`}>
      <title>{`${room.name} · the funhouse`}</title>
      <meta name="robots" content="noindex" />

      <nav className="hud" aria-label="Funhouse controls">
        <button type="button" onClick={toggleSound} aria-pressed={sound}>
          {sound ? '🔊 sound' : '🔇 muted'}
        </button>
        <button type="button" onClick={() => setMapOpen((o) => !o)} aria-expanded={mapOpen}>
          🗺 map {found.length}/{ROOM_IDS.length}
        </button>
        <Link to="/">🚪 leave</Link>
      </nav>
      {mapOpen && <FloorPlan current={room.id} onClose={() => setMapOpen(false)} />}

      {room.id === 'room1998' && <Marquee />}
      <h1 className="room-name">{room.name}</h1>
      {note && <p className="room-note">{note}</p>}
      <p className="room-intro">{room.intro}</p>

      {room.id === 'room1998' && (
        <p className="hit-counter">
          You are visitor #<span>{(1998 + found.length * 37).toString().padStart(6, '0')}</span>
        </p>
      )}

      {scene && (
        <>
          <SceneView key={room.id} scene={scene} room={room} onDoor={open} />
          <p className="wall-msg" role="status">
            {wallMsg}
          </p>
        </>
      )}

      {room.showcase && (
        <div className="showcase">
          <iframe src={`/exhibits/${room.showcase}/`} title={exhibit(room.showcase).title} />
        </div>
      )}

      {room.exhibits.length > 0 && (
        <section className="room-exhibits" aria-label="Exhibits">
          {room.exhibits.map((id) => (
            <ExhibitCard key={id} exhibit={exhibit(id)} variant="placard" />
          ))}
        </section>
      )}

      {!scene && (
        <>
          <section className="doors" aria-label="Doors">
            {room.doors.map((d) => (
              <button key={d.label} type="button" className="door" onClick={() => open(d)}>
                <span className="door-panel" aria-hidden="true" />
                <span className="door-label">{d.label}</span>
              </button>
            ))}
          </section>
          <p className="wall-msg" role="status">
            {wallMsg}
          </p>
        </>
      )}

      {jump && <JumpOut edge={jump.edge} line={jump.line} onDone={() => setJump(null)} />}
      {room.id === 'mirrors' && <WarpFilter />}
    </main>
  );
}

function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <span>
        🚧 UNDER CONSTRUCTION 🚧 best viewed in Netscape Navigator 4.0 at 800x600 🚧 sign my
        guestbook 🚧
      </span>
    </div>
  );
}

/** An SVG ripple filter for the Hall of Mirrors (CSS applies it to .room-mirrors). */
function WarpFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="warp">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="3">
          <animate
            attributeName="baseFrequency"
            dur="9s"
            values="0.012 0.03;0.02 0.05;0.012 0.03"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" scale="14" />
      </filter>
    </svg>
  );
}
