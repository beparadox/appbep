/**
 * Tiny sound-effects kit. Everything is synthesized with the Web Audio API,
 * so there are no audio files to download. Browsers only allow audio after
 * the visitor clicks something; the entrance's "Enter" button is that click.
 */
export type Sfx = 'creak' | 'thud' | 'boing' | 'sting' | 'jingle' | 'step';

let ctx: AudioContext | null = null;

/** Call from a click handler to unlock audio. */
export function unlockAudio(): void {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(
  type: OscillatorType,
  from: number,
  to: number,
  dur: number,
  vol = 0.2,
  at = 0,
): void {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

function noise(dur: number, vol = 0.2, cutoff = 800): void {
  if (!ctx) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buf;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

const SFX: Record<Sfx, () => void> = {
  // A door hinge: a rough low sawtooth that wobbles upward.
  creak: () => {
    tone('sawtooth', 70, 140, 0.35, 0.05);
    tone('sawtooth', 90, 60, 0.4, 0.04, 0.3);
  },
  // Walking into a wall.
  thud: () => {
    tone('sine', 140, 40, 0.3, 0.5);
    noise(0.12, 0.25, 400);
  },
  // The APF head popping out.
  boing: () => {
    tone('triangle', 150, 600, 0.12, 0.25);
    tone('triangle', 600, 200, 0.35, 0.2, 0.12);
  },
  // A short "dun dun" stinger.
  sting: () => {
    tone('square', 220, 218, 0.25, 0.06);
    tone('square', 233, 231, 0.25, 0.06);
    tone('square', 207, 205, 0.5, 0.07, 0.3);
  },
  // Off-key carnival calliope, played on entry.
  jingle: () => {
    [523, 659, 784, 740, 659, 523, 494, 523].forEach((f, i) =>
      tone('triangle', f, f * 0.98, 0.16, 0.12, i * 0.15),
    );
  },
  step: () => noise(0.06, 0.15, 300),
};

export function play(name: Sfx, enabled: boolean): void {
  if (!enabled || !ctx) return;
  SFX[name]();
}
