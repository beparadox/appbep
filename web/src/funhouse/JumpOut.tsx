import { useEffect, useRef } from 'react';
import apfHead from '../assets/cubes/apf-head-space.png';

export type JumpEdge = 'left' | 'right' | 'bottom';

/** How long he stays out, in ms. Matches the jump animations in funhouse.css. */
const OUT_MS = 2600;

/** The Angry Packers Fan pops out from an edge of the screen, yells something, then ducks back. */
export default function JumpOut({
  edge,
  line,
  onDone,
}: {
  edge: JumpEdge;
  line: string;
  onDone: () => void;
}) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), OUT_MS);
    return () => clearTimeout(t);
  }, [edge, line]);

  return (
    <div className={`jump-out jump-${edge}`}>
      <p className="jump-say">{line}</p>
      <img src={apfHead} alt="" />
    </div>
  );
}
