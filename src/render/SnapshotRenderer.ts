import { BOARD_WIDTH, VISIBLE_HEIGHT } from '../config/constants';
import type { RenderCell, Snapshot } from '../shared/snapshot';
import { drawCell, drawGhost, roundRect, shade } from './draw';
import type { BoardLayout } from './layout';
import { getTheme, colorOf } from './theme';

/**
 * Snapshot を盤面領域に描画する（モード非依存）。
 * RenderCell の type / state を見て、ブロック・ゴースト・明滅を描き分ける。
 */
export class SnapshotRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  drawBoard(snapshot: Snapshot, layout: BoardLayout, blinkOn: boolean): void {
    const theme = getTheme();
    const { cellSize, boardX, boardY } = layout;
    const w = BOARD_WIDTH * cellSize;
    const h = VISIBLE_HEIGHT * cellSize;

    this.ctx.save();

    // 盤面の影（浮遊感）。
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0,0,0,0.55)';
    this.ctx.shadowBlur = cellSize * 0.8;
    this.ctx.shadowOffsetY = cellSize * 0.2;
    this.ctx.fillStyle = shade(theme.background, -0.4);
    roundRect(this.ctx, boardX, boardY, w, h, 8);
    this.ctx.fill();
    this.ctx.restore();

    // 盤面背景（縦グラデーション）。
    const bg = this.ctx.createLinearGradient(boardX, boardY, boardX, boardY + h);
    bg.addColorStop(0, shade(theme.background, 0.05));
    bg.addColorStop(1, shade(theme.background, -0.18));
    this.ctx.fillStyle = bg;
    roundRect(this.ctx, boardX, boardY, w, h, 8);
    this.ctx.fill();

    // クリップしてグリッド・セルを描く。
    this.ctx.save();
    roundRect(this.ctx, boardX, boardY, w, h, 8);
    this.ctx.clip();
    this.drawGridLines(layout);

    for (let y = 0; y < snapshot.grid.length; y++) {
      const row = snapshot.grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (!cell) continue;
        this.drawSingleCell(cell, boardX + x * cellSize, boardY + y * cellSize, cellSize, blinkOn);
      }
    }
    this.ctx.restore();

    // 外枠（アクセントの光）。
    this.ctx.lineWidth = Math.max(2, cellSize * 0.08);
    this.ctx.strokeStyle = theme.accent;
    this.ctx.shadowColor = theme.accent;
    this.ctx.shadowBlur = cellSize * 0.5;
    roundRect(this.ctx, boardX, boardY, w, h, 8);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawSingleCell(
    cell: RenderCell,
    px: number,
    py: number,
    size: number,
    blinkOn: boolean,
  ): void {
    if (cell.type === 'empty') return;

    if (cell.type === 'ghost') {
      drawGhost(this.ctx, px, py, size, colorOf(cell.id));
      return;
    }

    drawCell(this.ctx, px, py, size, colorOf(cell.id));

    // 消去中のフラッシュ（明滅）。
    if (cell.state === 'clearing') {
      this.ctx.save();
      this.ctx.globalAlpha = blinkOn ? 0.85 : 0.2;
      this.ctx.fillStyle = '#ffffff';
      const gap = Math.max(1, Math.floor(size * 0.07));
      roundRect(this.ctx, px + gap, py + gap, size - gap * 2, size - gap * 2, size * 0.16);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawGridLines(layout: BoardLayout): void {
    const theme = getTheme();
    const { cellSize, boardX, boardY } = layout;
    this.ctx.strokeStyle = shade(theme.grid, -0.1);
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.5;
    for (let x = 1; x < BOARD_WIDTH; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(boardX + x * cellSize, boardY);
      this.ctx.lineTo(boardX + x * cellSize, boardY + VISIBLE_HEIGHT * cellSize);
      this.ctx.stroke();
    }
    for (let y = 1; y < VISIBLE_HEIGHT; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(boardX, boardY + y * cellSize);
      this.ctx.lineTo(boardX + BOARD_WIDTH * cellSize, boardY + y * cellSize);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
  }
}
