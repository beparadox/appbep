import { closet } from './closet';
import { parlor } from './parlor';
import type { Scene } from './types';

/** Rooms drawn as pictures, by room id. A room without one keeps the plain layout. */
export const SCENES: Record<string, Scene> = { parlor, closet };

export type { Hotspot, Pokes, Scene } from './types';
