/** Canvas の低レベル描画プリミティブ。 */

export function clearRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** 角丸セルを描く。 */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  color: string,
  alpha = 1,
): void {
  const pad = Math.max(1, Math.floor(size * 0.06));
  const r = Math.max(2, Math.floor(size * 0.12));
  const x = px + pad;
  const y = py + pad;
  const s = size - pad * 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, s, s, r);
  ctx.fill();

  // ハイライト（立体感）。
  ctx.globalAlpha = alpha * 0.25;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, s, Math.max(2, s * 0.3), r);
  ctx.fill();
  ctx.restore();
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

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { color: string; size: number; align?: CanvasTextAlign; bold?: boolean } = {
    color: '#fff',
    size: 14,
  },
): void {
  ctx.fillStyle = options.color;
  ctx.font = `${options.bold ? 'bold ' : ''}${options.size}px system-ui, sans-serif`;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}
