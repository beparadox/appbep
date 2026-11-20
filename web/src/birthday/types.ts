/**
 * A birthday card's data: /cards/<id>/card.json, made by scripts/card-picker/build.py.
 * Cards (and their photos) live only in the site bucket, never in this repo.
 */

export interface PhotoSlide {
  type: 'photo';
  src: string;
  w: number;
  h: number;
}

export interface VideoSlide {
  type: 'video';
  src: string;
  /** A still of the first frame, shown while it loads. */
  poster: string;
  w: number;
  h: number;
  /** Plays with its own sound (the music steps aside), or silently under the music. */
  sound: boolean;
}

export type Slide = PhotoSlide | VideoSlide;

export interface CardData {
  version: 1;
  name: string;
  age: number | null;
  from: string;
  /** Paragraphs. */
  message: string[];
  photoSeconds: number;
  music: string | null;
  /** Credit for the song, shown small at the bottom of the message. */
  musicCredit?: string | null;
  slides: Slide[];
  /**
   * The bonus round: played fast after the show, and a gallery behind a link. title is the
   * words on its opening card (the link's words if not given).
   */
  bonus: {
    link: string;
    title?: string | null;
    /** How long each photo shows when the bonus round flips through (a third of a second if not given). */
    seconds?: number | null;
    slides: Slide[];
  } | null;
  /** The colours: pink (the default) or blue. */
  theme?: 'pink' | 'blue' | null;
  /**
   * What follows the show. 'message' (the default): the message with balloons dropping,
   * a countdown, then the bonus round. 'bonusRound': "Happy Birthday <name>!" with
   * balloons dropping, "Get ready for the bonus round!", the bonus round, then the message.
   */
  ending?: 'message' | 'bonusRound' | null;
}

/** Card ids are random letters and digits (see build.py). */
export const validId = (id: string) => /^[a-z0-9]{8,32}$/.test(id);

export const cardBase = (id: string) => `/cards/${id}/`;

/** 15 -> "15th", 21 -> "21st", 12 -> "12th". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix}`;
}
