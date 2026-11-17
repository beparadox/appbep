/**
 * Confetti on a full-screen canvas: burst(x, y) throws a handful from a point.
 * Pieces fall, flutter and fade; the canvas stops drawing when they're all gone.
 */

const COLORS = ['#ff5fa2', '#ffd166', '#4fd1c5', '#9b7bff', '#ffffff', '#ff8a5b'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  size: number;
  color: string;
  life: number;
}

export interface Confetti {
  burst(x: number, y: number, count?: number, spread?: number): void;
  stop(): void;
}

export function makeConfetti(canvas: HTMLCanvasElement): Confetti {
  const c = canvas.getContext('2d');
  let pieces: Piece[] = [];
  let raf = 0;
  let last = 0;
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    c?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (!c) return;
    fit();
    c.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (const p of pieces) {
      p.vy += 600 * dt;
      p.vx *= 1 - 1.5 * dt;
      p.vy *= 1 - 1.2 * dt;
      p.x += (p.vx + Math.sin(p.angle * 2) * 30) * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      p.life -= dt;
      c.save();
      c.globalAlpha = Math.max(0, Math.min(1, p.life));
      c.translate(p.x, p.y);
      c.rotate(p.angle);
      c.fillStyle = p.color;
      c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 + Math.abs(Math.cos(p.angle)) * 4);
      c.restore();
    }
    pieces = pieces.filter((p) => p.life > 0 && p.y < canvas.clientHeight + 40);
    raf = pieces.length ? requestAnimationFrame(frame) : 0;
    if (!raf) c.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  return {
    burst(x, y, count = 80, spread = 1) {
      const n = calm ? Math.round(count / 4) : count;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * spread;
        const speed = 250 + Math.random() * 450;
        pieces.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          spin: (Math.random() - 0.5) * 12,
          angle: Math.random() * Math.PI,
          size: 6 + Math.random() * 7,
          color: COLORS[i % COLORS.length],
          life: 2 + Math.random() * 1.5,
        });
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      pieces = [];
    },
  };
}
