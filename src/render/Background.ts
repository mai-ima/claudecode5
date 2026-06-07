import { shade } from './draw';
import { getTheme } from './theme';

/**
 * プリセット別の背景演出。`Theme.backgroundEffect` に応じて描き分ける。
 * 盤面の下に毎フレーム描画する。
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
): void {
  const theme = getTheme();
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  switch (theme.backgroundEffect) {
    case 'gradient':
      drawGradient(ctx, width, height, theme.accent, theme.accent2);
      break;
    case 'particles':
      drawGradient(ctx, width, height, theme.accent, theme.accent2);
      drawParticles(ctx, width, height, timeMs, theme.accent, theme.accent2);
      break;
    case 'scanline':
      drawScanlines(ctx, width, height);
      break;
    case 'none':
    default:
      break;
  }
}

function drawGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  a: string,
  b: string,
): void {
  ctx.save();
  ctx.globalAlpha = 0.1;
  const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, Math.max(w, h));
  g.addColorStop(0, a);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const g2 = ctx.createRadialGradient(w * 0.8, h * 0.85, 0, w * 0.8, h * 0.85, Math.max(w, h));
  g2.addColorStop(0, b);
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  a: string,
  b: string,
): void {
  ctx.save();
  ctx.globalAlpha = 0.25;
  const count = 26;
  for (let i = 0; i < count; i++) {
    const seed = i * 97.13;
    const x = ((Math.sin(seed) * 0.5 + 0.5) * w + i * 11) % w;
    const speed = 12 + (i % 5) * 6;
    const y = (h - ((t / 1000) * speed + i * 53) % (h + 40)) % (h + 40);
    const r = 2 + (i % 4);
    ctx.fillStyle = i % 2 === 0 ? a : b;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = shade('#ffffff', 0);
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();
}
