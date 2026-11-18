/**
 * The card's background music. It loops, fades out while a video plays its own sound
 * ("ducking"), and fades back in after.
 *
 * Fading needs the Web Audio API: iPhones ignore an <audio> element's volume, so the
 * music is routed through a gain node instead. If Web Audio isn't available it still
 * works, just with a cut instead of a fade.
 */

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

const FADE = 0.5;

export class Music {
  private el: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private pauseTimer = 0;
  private muted = false;
  private ducked = false;

  constructor(src: string) {
    this.el = new Audio(src);
    this.el.loop = true;
    this.el.preload = 'auto';
  }

  /** Start the music. Must be called from inside a tap or click (browsers insist). */
  start(): void {
    // On iPhones, Web Audio is silenced by the ring/silent switch unless the page says
    // it's playing media, like a music app (Safari 17+).
    try {
      const nav = navigator as AudioSessionNavigator;
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* not supported: fine */
    }
    // Opened from a file (the offline keepsake), browsers silence Web Audio from a media
    // element as "cross-origin", so play it plainly: cuts instead of fades.
    if (location.protocol === 'file:') {
      void this.el.play().catch(() => {});
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.ctx.createMediaElementSource(this.el).connect(this.gain).connect(this.ctx.destination);
      void this.ctx.resume();
    } catch {
      this.ctx = null;
      this.gain = null;
    }
    void this.el.play().catch(() => {});
  }

  /** Fade out for a video with sound (true), or back in after it (false). */
  duck(on: boolean): void {
    this.ducked = on;
    this.apply();
  }

  setMuted(on: boolean): void {
    this.muted = on;
    this.apply();
  }

  stop(): void {
    clearTimeout(this.pauseTimer);
    this.el.pause();
    void this.ctx?.close().catch(() => {});
  }

  private apply(): void {
    const level = this.muted || this.ducked ? 0 : 1;
    if (this.ctx && this.gain) {
      const now = this.ctx.currentTime;
      const g = this.gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(level, now + FADE);
    } else {
      this.el.volume = level;
    }
    clearTimeout(this.pauseTimer);
    if (level === 0) {
      // Pause once faded, so it's silent even where the volume can't be changed, and
      // so it picks up where it left off.
      this.pauseTimer = window.setTimeout(() => this.el.pause(), FADE * 1000 + 50);
    } else if (this.el.paused) {
      void this.el.play().catch(() => {});
    }
  }
}
