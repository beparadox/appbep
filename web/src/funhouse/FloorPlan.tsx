import { useNavigate } from 'react-router-dom';
import { ROOMS } from './rooms';
import { forgetEverything, useFunhouse } from './state';

const COLS = 3;
const ROWS = 4;

/**
 * The floor plan fills in as you explore: rooms you've found are labeled
 * (and you can jump to them), the rest are "?".
 */
export default function FloorPlan({ current, onClose }: { current: string; onClose: () => void }) {
  const { found } = useFunhouse();
  const navigate = useNavigate();
  const at = (c: number, r: number) =>
    Object.values(ROOMS).find((room) => room.map[0] === c && room.map[1] === r);

  return (
    <div className="floor-plan" role="dialog" aria-label="Floor plan">
      <div className="plan-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const room = at(i % COLS, Math.floor(i / COLS));
          if (!room) return <div key={i} className="plan-cell plan-empty" />;
          if (!found.includes(room.id))
            return (
              <div key={i} className="plan-cell plan-unknown">
                ?
              </div>
            );
          return (
            <button
              key={i}
              type="button"
              className={`plan-cell${room.id === current ? ' plan-here' : ''}`}
              onClick={() => {
                onClose();
                navigate(`/funhouse/${room.id}`);
              }}
            >
              {room.name}
            </button>
          );
        })}
      </div>
      <p>
        <button type="button" onClick={onClose}>
          close
        </button>{' '}
        <button type="button" onClick={forgetEverything}>
          forget everything
        </button>
      </p>
    </div>
  );
}
