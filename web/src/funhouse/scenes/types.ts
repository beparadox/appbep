import type { ComponentType } from 'react';

/**
 * A clickable spot in a scene, in the scene's own drawing units (its viewBox).
 * A door hotspot's `id` is the door's label in rooms.ts; an exhibit's is its
 * registry id.
 */
export interface Hotspot {
  kind: 'door' | 'exhibit';
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where its name tag goes. */
  label?: 'above' | 'below';
  /** Line the tag up with the hotspot's left or right edge (for spots at the picture's edges). */
  align?: 'start' | 'end';
}

/** A room drawn as a picture: the art, and where its doors and exhibits are. */
export interface Scene {
  width: number;
  height: number;
  /** The drawing: SVG elements, placed inside an <svg> of the size above. */
  Art: ComponentType;
  hotspots: Hotspot[];
}
