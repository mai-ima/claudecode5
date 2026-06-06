import { VISIBLE_HEIGHT } from '../config/constants';
import type { PiecePreview, Snapshot } from '../shared/snapshot';
import { drawCell, drawText, roundRect } from './draw';
import { LEFT_PANEL_CELLS } from './layout';
import type { BoardLayout } from './layout';
import { colorOf, getTheme } from './theme';

/** Hold / Next / スコア等の HUD を盤面の左右に描画する。 */
export class HudRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  draw(snapshot: Snapshot, layout: BoardLayout): void {
    this.drawHold(snapshot, layout);
    this.drawNext(snapshot, layout);
    this.drawStats(snapshot, layout);
    this.drawGarbageGauge(snapshot, layout);
  }

  private drawHold(snapshot: Snapshot, layout: BoardLayout): void {
    const { cellSize, boardY } = layout;
    const x = cellSize * 0.4;
    const y = boardY;
    drawText(this.ctx, 'HOLD', x, y, {
      color: getTheme().text,
      size: cellSize * 0.5,
      bold: true,
    });
    this.drawPanel(x, y + cellSize * 0.7, (LEFT_PANEL_CELLS - 1) * cellSize, cellSize * 3);
    if (snapshot.hold) {
      this.drawPreview(snapshot.hold, x + cellSize * 0.4, y + cellSize * 1.1, cellSize * 0.7);
    }
  }

  private drawNext(snapshot: Snapshot, layout: BoardLayout): void {
    const { cellSize, boardX } = layout;
    const x = boardX + (10 + 0.4) * cellSize;
    let y = layout.boardY;
    drawText(this.ctx, 'NEXT', x, y, {
      color: getTheme().text,
      size: cellSize * 0.5,
      bold: true,
    });
    y += cellSize * 0.8;
    const previewSize = cellSize * 0.6;
    for (const piece of snapshot.next) {
      this.drawPanel(x, y, cellSize * 4, cellSize * 2.4);
      this.drawPreview(piece, x + cellSize * 0.4, y + cellSize * 0.4, previewSize);
      y += cellSize * 2.6;
    }
  }

  private drawStats(snapshot: Snapshot, layout: BoardLayout): void {
    const { cellSize, boardX } = layout;
    const x = cellSize * 0.4;
    let y = layout.boardY + cellSize * 4.5;
    const theme = getTheme();
    const line = (label: string, value: string): void => {
      drawText(this.ctx, label, x, y, { color: theme.accent, size: cellSize * 0.45, bold: true });
      drawText(this.ctx, value, x, y + cellSize * 0.5, {
        color: theme.text,
        size: cellSize * 0.65,
        bold: true,
      });
      y += cellSize * 1.5;
    };
    line('SCORE', String(snapshot.hud.score));
    line('LEVEL', String(snapshot.hud.level));
    line('LINES', String(snapshot.hud.lines));
    if (snapshot.hud.combo > 1) line('COMBO', `${snapshot.hud.combo}`);
    if (snapshot.hud.backToBack) {
      drawText(this.ctx, 'B2B', x, y, { color: theme.accent, size: cellSize * 0.5, bold: true });
      y += cellSize;
    }
    if (snapshot.hud.lastClearLabel) {
      drawText(this.ctx, snapshot.hud.lastClearLabel, boardX, layout.boardY - cellSize * 0.1, {
        color: theme.accent,
        size: cellSize * 0.5,
        bold: true,
      });
    }
  }

  /** 予告おじゃまゲージを盤面左脇に縦に描く。 */
  private drawGarbageGauge(snapshot: Snapshot, layout: BoardLayout): void {
    if (snapshot.garbageQueue <= 0) return;
    const { cellSize, boardX, boardY } = layout;
    const gx = boardX - cellSize * 0.35;
    const total = VISIBLE_HEIGHT * cellSize;
    const filled = Math.min(VISIBLE_HEIGHT, snapshot.garbageQueue) * cellSize;
    this.ctx.fillStyle = '#ef4444';
    this.ctx.fillRect(gx, boardY + total - filled, cellSize * 0.25, filled);
  }

  private drawPreview(piece: PiecePreview, x: number, y: number, size: number): void {
    for (let r = 0; r < piece.cells.length; r++) {
      const row = piece.cells[r];
      if (!row) continue;
      for (let cIdx = 0; cIdx < row.length; cIdx++) {
        const cell = row[cIdx];
        if (!cell || cell.type === 'empty') continue;
        drawCell(this.ctx, x + cIdx * size, y + r * size, size, colorOf(cell.id));
      }
    }
  }

  private drawPanel(x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = getTheme().panel;
    roundRect(this.ctx, x, y, w, h, 6);
    this.ctx.fill();
  }
}
