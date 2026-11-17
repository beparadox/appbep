import {
  ARM,
  CHUTE_TOP,
  CHUTE_X,
  H,
  RAIL_Y,
  REACH,
  W,
  type Face,
  type Game,
  type Prize,
  underClaw,
} from './engine';

/**
 * Draws the inside of the glass in the funhouse style: flat colours, thick dark ink
 * outlines. Everything is in the engine's units; the canvas is scaled to fit.
 */

const INK = '#05010d';

export function draw(c: CanvasRenderingContext2D, g: Game, time: number): void {
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';

  // The back of the cabinet, with a few pink lights blinking along the top.
  c.fillStyle = '#1a1030';
  c.fillRect(0, 0, W, H);
  c.strokeStyle = '#24163e';
  c.lineWidth = 10;
  for (let x = -H; x < W; x += 40) line(c, x, H, x + H, 0);
  for (let i = 0; i < 9; i++) {
    const on = Math.floor(time * 3 + i) % 3 === 0;
    c.fillStyle = on ? '#ff4ad0' : '#5a1a4a';
    circle(c, 20 + i * 40, 8, 4);
    c.fill();
  }

  drawChute(c);
  // The plush in the claw is drawn with the claw, in front of the rest.
  for (const p of g.prizes) if (p !== g.held) drawPrize(c, p);
  drawClaw(c, g);

  // Glare on the glass.
  c.fillStyle = 'rgba(255, 255, 255, 0.06)';
  c.beginPath();
  c.moveTo(W * 0.55, 0);
  c.lineTo(W * 0.72, 0);
  c.lineTo(W * 0.3, H);
  c.lineTo(W * 0.13, H);
  c.fill();
  c.restore();
}

function drawChute(c: CanvasRenderingContext2D): void {
  c.fillStyle = '#0b0618';
  c.fillRect(0, CHUTE_TOP, CHUTE_X, H - CHUTE_TOP);
  c.fillStyle = '#ffe14d';
  c.font = "bold 13px 'Courier New', monospace";
  c.textAlign = 'center';
  c.fillText('PRIZE', CHUTE_X / 2, CHUTE_TOP + 40);
  c.fillText('▼', CHUTE_X / 2, CHUTE_TOP + 60);
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.fillStyle = '#c2186b';
  c.beginPath();
  c.rect(CHUTE_X - 4, CHUTE_TOP, 8, H - CHUTE_TOP);
  c.fill();
  c.stroke();
}

function drawPrize(c: CanvasRenderingContext2D, p: Prize): void {
  const { r, fill, face, id } = p.kind;
  c.save();
  c.translate(p.x, p.y);
  c.rotate(Math.sin(p.spin) * 0.35);
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.fillStyle = fill;

  // Ears (or a beak, or a cap) go behind the head.
  if (id === 'lime' || id === 'pink') {
    for (const s of [-1, 1]) {
      circle(c, s * r * 0.7, -r * 0.75, r * 0.38);
      c.fill();
      c.stroke();
    }
  } else if (id === 'cyan') {
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * r * 0.95, -r * 0.2);
      c.lineTo(s * r * 0.75, -r * 1.25);
      c.lineTo(s * r * 0.15, -r * 0.85);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }

  circle(c, 0, 0, r);
  c.fill();
  c.stroke();

  if (id === 'apf') {
    // A gold cap, pulled down low.
    c.fillStyle = '#ffb612';
    c.beginPath();
    c.arc(0, -r * 0.15, r * 0.95, Math.PI * 1.05, Math.PI * 1.95);
    c.closePath();
    c.fill();
    c.stroke();
    line(c, -r * 0.2, -r * 0.2, r * 1.2, -r * 0.2);
  }
  if (id === 'duck') {
    c.fillStyle = '#ff8a1a';
    c.beginPath();
    c.ellipse(r * 0.55, r * 0.25, r * 0.5, r * 0.22, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  drawFace(c, face, r);
  c.restore();
}

function drawFace(c: CanvasRenderingContext2D, face: Face, r: number): void {
  c.fillStyle = INK;
  c.strokeStyle = INK;
  c.lineWidth = 2;
  const ex = r * 0.35;
  const ey = -r * 0.1;
  const dot = (x: number) => {
    circle(c, x, ey, r * 0.1);
    c.fill();
  };
  switch (face) {
    case 'happy':
      dot(-ex);
      dot(ex);
      c.beginPath();
      c.arc(0, r * 0.15, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
      break;
    case 'oneEye':
      dot(-ex);
      line(c, ex - 3, ey - 3, ex + 3, ey + 3);
      line(c, ex - 3, ey + 3, ex + 3, ey - 3);
      line(c, -r * 0.25, r * 0.4, r * 0.25, r * 0.35);
      break;
    case 'sleepy':
      line(c, -ex - 3, ey, -ex + 3, ey);
      line(c, ex - 3, ey, ex + 3, ey);
      circle(c, 0, r * 0.4, r * 0.08);
      c.stroke();
      break;
    case 'worried':
      dot(-ex * 0.7);
      dot(ex * 0.1);
      line(c, -ex - 2, ey - 6, -ex * 0.2, ey - 9);
      break;
    case 'smug':
      line(c, -ex - 4, ey, -ex + 4, ey + 1);
      line(c, ex - 4, ey + 1, ex + 4, ey);
      c.beginPath();
      c.moveTo(-r * 0.3, r * 0.35);
      c.quadraticCurveTo(r * 0.1, r * 0.5, r * 0.4, r * 0.2);
      c.stroke();
      break;
    case 'angry':
      dot(-ex);
      dot(ex);
      c.lineWidth = 3;
      line(c, -ex - 5, ey - 7, -ex + 4, ey - 3);
      line(c, ex + 5, ey - 7, ex - 4, ey - 3);
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, r * 0.6, r * 0.3, 1.15 * Math.PI, 1.85 * Math.PI);
      c.stroke();
      break;
  }
}

function drawClaw(c: CanvasRenderingContext2D, g: Game): void {
  const x = g.clawX;
  const y = g.clawY;
  c.strokeStyle = INK;

  // The rail and the carriage on it.
  c.lineWidth = 6;
  c.strokeStyle = '#8a8f98';
  line(c, 0, RAIL_Y - 18, W, RAIL_Y - 18);
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.fillStyle = '#5a5f68';
  c.beginPath();
  c.rect(x - 14, RAIL_Y - 26, 28, 14);
  c.fill();
  c.stroke();
  // The cable.
  c.lineWidth = 2;
  line(c, x, RAIL_Y - 12, x, y - 8);

  if (g.held) drawPrize(c, g.held);

  // Two fingers, each a hooked line from the hub out to the tip.
  // Closed fingers stop at the sides of whatever they're closing on.
  const around = g.held ?? (g.phase === 'close' ? underClaw(g) : null);
  const closed = around ? Math.max(6, around.kind.r - Math.abs(around.x - x) + 3) : 6;
  const spread = Math.max(closed, 6 + (REACH - 2) * g.open);
  const tipY = y + ARM;
  c.lineWidth = 5;
  c.strokeStyle = '#c9ced6';
  for (const s of [-1, 1]) {
    const knee = x + s * (spread + 6);
    const tip = x + s * spread;
    c.beginPath();
    c.moveTo(x + s * 6, y + 4);
    c.lineTo(knee, y + ARM * 0.55);
    c.lineTo(tip, tipY);
    c.lineTo(tip - s * 7, tipY - 2);
    c.stroke();
  }
  // The hub.
  c.lineWidth = 3;
  c.strokeStyle = INK;
  c.fillStyle = '#ffe14d';
  c.beginPath();
  c.rect(x - 11, y - 9, 22, 15);
  c.fill();
  c.stroke();
}

function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}

function line(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}
