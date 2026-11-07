import { useEffect, useRef } from 'react';
import apfHead from '../assets/cubes/apf-head-space.png';

export type JumpEdge = 'left' | 'right' | 'bottom';

/** The Angry Packers Fan pops out from an edge of the screen, then ducks back. */
export default function JumpOut({ edge, onDone }: { edge: JumpEdge; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 1300);
    return () => clearTimeout(t);
  }, [edge]);

  return <img className={`jump-out jump-${edge}`} src={apfHead} alt="" aria-hidden="true" />;
}
