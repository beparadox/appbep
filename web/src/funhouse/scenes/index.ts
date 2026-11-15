import { attic } from './attic';
import { closet } from './closet';
import { foyer } from './foyer';
import { parlor } from './parlor';
import { stairs } from './stairs';
import type { Scene } from './types';

/** Rooms drawn as pictures, by room id. A room without one keeps the plain layout. */
export const SCENES: Record<string, Scene> = { foyer, parlor, closet, stairs, attic };

export type { Hotspot, Pokes, Scene } from './types';
