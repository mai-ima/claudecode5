import { BOARD_WIDTH, VISIBLE_HEIGHT } from '../config/constants';
import type { RenderCell, Snapshot } from '../shared/snapshot';
import { drawCell, roundRect } from './draw';
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

    // 盤面背景とグリッド。
    this.ctx.save();
    this.ctx.fillStyle = theme.background;
    this.ctx.fillRect(boardX, boardY, BOARD_WIDTH * cellSize, VISIBLE_HEIGHT * cellSize);
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
  }

  private drawSingleCell(
    cell: RenderCell,
    px: number,
    py: number,
    size: number,
    blinkOn: boolean,
  ): void {
    const theme = getTheme();
    if (cell.type === 'empty') return;

    if (cell.type === 'ghost') {
      drawCell(this.ctx, px, py, size, colorOf(cell.id), theme.ghostAlpha);
      return;
    }

    // 明滅（消去中）。
    const alpha = cell.state === 'clearing' ? (blinkOn ? 1 : 0.2) : 1;
    drawCell(this.ctx, px, py, size, colorOf(cell.id), alpha);
  }

  private drawGridLines(layout: BoardLayout): void {
    const theme = getTheme();
    const { cellSize, boardX, boardY } = layout;
    this.ctx.strokeStyle = theme.grid;
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(boardX + x * cellSize, boardY);
      this.ctx.lineTo(boardX + x * cellSize, boardY + VISIBLE_HEIGHT * cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= VISIBLE_HEIGHT; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(boardX, boardY + y * cellSize);
      this.ctx.lineTo(boardX + BOARD_WIDTH * cellSize, boardY + y * cellSize);
      this.ctx.stroke();
    }
    // 外枠。
    this.ctx.strokeStyle = theme.accent;
    this.ctx.lineWidth = 2;
    roundRect(this.ctx, boardX, boardY, BOARD_WIDTH * cellSize, VISIBLE_HEIGHT * cellSize, 4);
    this.ctx.stroke();
  }
}
