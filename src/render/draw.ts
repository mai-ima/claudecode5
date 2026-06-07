/** Canvas の低レベル描画プリミティブ。 */

/** 日本語対応のフォントスタック。 */
export const FONT_STACK =
  "'Segoe UI', system-ui, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', Meiryo, sans-serif";

/** #rrggbb を明暗調整した rgb 文字列に変換する（amt: -1..1）。 */
export function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const num = parseInt(m[1] as string, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const f = (v: number): number =>
    Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  r = f(r);
  g = f(g);
  b = f(b);
  return `rgb(${r}, ${g}, ${b})`;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export type CellStyle = 'gradient' | 'flat' | 'outline';

/** ブロックセルを描く。スキンの style に応じて見た目を変える。 */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  color: string,
  alpha = 1,
  style: CellStyle = 'gradient',
): void {
  const gap = Math.max(1, Math.floor(size * 0.07));
  const x = px + gap;
  const y = py + gap;
  const s = size - gap * 2;
  const r = Math.max(2, size * 0.16);

  ctx.save();
  ctx.globalAlpha = alpha;

  if (style === 'outline') {
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = color;
    roundRect(ctx, x, y, s, s, r);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.strokeStyle = color;
    roundRect(ctx, x, y, s, s, r);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'flat') {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, s, s, r);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.strokeStyle = shade(color, -0.4);
    roundRect(ctx, x, y, s, s, r);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // gradient（既定・立体）。
  const grad = ctx.createLinearGradient(x, y, x, y + s);
  grad.addColorStop(0, shade(color, 0.32));
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, shade(color, -0.28));
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, s, s, r);
  ctx.fill();

  // 上部の光沢。
  ctx.globalAlpha = alpha * 0.4;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x + s * 0.12, y + s * 0.1, s * 0.76, s * 0.2, r * 0.5);
  ctx.fill();

  // 縁取り。
  ctx.globalAlpha = alpha * 0.55;
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.strokeStyle = shade(color, -0.45);
  roundRect(ctx, x, y, s, s, r);
  ctx.stroke();

  ctx.restore();
}

/** ゴースト（着地予測）を半透明の枠線で描く。 */
export function drawGhost(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  color: string,
): void {
  const gap = Math.max(1, Math.floor(size * 0.07));
  const x = px + gap;
  const y = py + gap;
  const s = size - gap * 2;
  const r = Math.max(2, size * 0.16);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, s, s, r);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.strokeStyle = color;
  roundRect(ctx, x, y, s, s, r);
  ctx.stroke();
  ctx.restore();
}

export interface TextOptions {
  color: string;
  size: number;
  align?: CanvasTextAlign;
  bold?: boolean;
  shadow?: boolean;
  baseline?: CanvasTextBaseline;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: TextOptions = { color: '#fff', size: 14 },
): void {
  ctx.save();
  ctx.font = `${options.bold ? '700 ' : '400 '}${options.size}px ${FONT_STACK}`;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = options.baseline ?? 'top';
  if (options.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = Math.max(2, options.size * 0.18);
    ctx.shadowOffsetY = Math.max(1, options.size * 0.06);
  }
  ctx.fillStyle = options.color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
