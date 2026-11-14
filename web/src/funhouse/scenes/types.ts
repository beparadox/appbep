import type { ComponentType } from 'react';

/** Where a clickable spot sits, in the scene's own drawing units (its viewBox). */
interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where its name tag goes. */
  label?: 'above' | 'below';
  /** Line the tag up with the hotspot's left or right edge (for spots at the picture's edges). */
  align?: 'start' | 'end';
}

/**
 * A clickable spot in a scene:
 * - a door (`id` is the door's label in rooms.ts) or an exhibit (`id` is its registry id),
 *   which always show their name tag;
 * - a prop: something to poke. Each poke bumps the counter `poke` (the art can react to
 *   it) and says the next of `says`. Its tag shows only on hover or focus, so props
 *   are there to be found.
 */
export type Hotspot = Spot &
  (
    | { kind: 'door' | 'exhibit'; id: string }
    | { kind: 'prop'; id: string; name: string; poke: string; says: string[] }
  );

/**
 * How many times each prop counter has been poked, handed to the art. Walking into a
 * dead-end door counts too, under the door's label (e.g. pokes['Climb the stairs']).
 */
export type Pokes = Record<string, number>;

/** A room drawn as a picture: the art, and where its doors, exhibits and props are. */
export interface Scene {
  width: number;
  height: number;
  /** The drawing: SVG elements, placed inside an <svg> of the size above. */
  Art: ComponentType<{ pokes: Pokes }>;
  hotspots: Hotspot[];
}
