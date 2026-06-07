import type { PiecePreview, Snapshot } from '../shared/snapshot';
import { drawCell, drawText, roundRect, shade } from './draw';
import { localizeClearLabel } from './labels';
import { LEFT_PANEL_CELLS, RIGHT_PANEL_CELLS } from './layout';
import type { BoardLayout } from './layout';
import { colorOf, getTheme } from './theme';

/** Hold / Next / スコア等の HUD を盤面の左右に描画する（日本語表示）。 */
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
    const w = (LEFT_PANEL_CELLS - 0.8) * cellSize;
    const y = boardY;
    this.drawPanel(x, y, w, cellSize * 3, 'ホールド');
    if (snapshot.hold) {
      this.drawPreviewCentered(snapshot.hold, x, y + cellSize * 0.9, w, cellSize * 2, cellSize * 0.7);
    }
  }

  private drawNext(snapshot: Snapshot, layout: BoardLayout): void {
    const { cellSize, boardX } = layout;
    const x = boardX + (layout.cols + 0.4) * cellSize;
    const w = (RIGHT_PANEL_CELLS - 0.8) * cellSize;
    let y = layout.boardY;
    const count = Math.min(snapshot.next.length, 5);
    const panelH = cellSize * (0.7 + count * 2.1);
    this.drawPanel(x, y, w, panelH, 'ネクスト');
    y += cellSize * 0.9;
    for (let i = 0; i < count; i++) {
      const piece = snapshot.next[i];
      if (piece) this.drawPreviewCentered(piece, x, y, w, cellSize * 1.8, cellSize * 0.6);
      y += cellSize * 2.1;
    }
  }

  private drawStats(snapshot: Snapshot, layout: BoardLayout): void {
    const { cellSize, boardX } = layout;
    const x = cellSize * 0.4;
    const w = (LEFT_PANEL_CELLS - 0.8) * cellSize;
    let y = layout.boardY + cellSize * 3.5;
    const theme = getTheme();

    const stat = (label: string, value: string): void => {
      this.drawPanel(x, y, w, cellSize * 1.5);
      drawText(this.ctx, label, x + cellSize * 0.25, y + cellSize * 0.18, {
        color: theme.accent,
        size: cellSize * 0.4,
        bold: true,
      });
      drawText(this.ctx, value, x + w - cellSize * 0.25, y + cellSize * 0.7, {
        color: theme.text,
        size: cellSize * 0.62,
        bold: true,
        align: 'right',
      });
      y += cellSize * 1.7;
    };
    stat('スコア', snapshot.hud.score.toLocaleString());
    stat('レベル', String(snapshot.hud.level));
    stat('ライン', String(snapshot.hud.lines));
    if (snapshot.hud.combo > 1) stat('れんさ', `${snapshot.hud.combo}`);

    if (snapshot.hud.backToBack) {
      drawText(this.ctx, 'BACK-TO-BACK', x + cellSize * 0.1, y, {
        color: '#facc15',
        size: cellSize * 0.42,
        bold: true,
        shadow: true,
      });
    }

    // 直近の役を盤面上部中央に表示。
    if (snapshot.hud.lastClearLabel) {
      drawText(
        this.ctx,
        localizeClearLabel(snapshot.hud.lastClearLabel),
        boardX + (layout.cols * cellSize) / 2,
        layout.boardY - cellSize * 0.05,
        { color: theme.accent, size: cellSize * 0.5, bold: true, align: 'center', baseline: 'bottom' },
      );
    }
  }

  /** 予告おじゃまゲージ（赤いセグメント）を盤面左脇に縦に描く。 */
  private drawGarbageGauge(snapshot: Snapshot, layout: BoardLayout): void {
    const { cellSize, boardX, boardY, rows } = layout;
    const gx = boardX - cellSize * 0.45;
    const total = rows * cellSize;
    const gw = cellSize * 0.3;
    // 背景レール。
    this.ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(this.ctx, gx, boardY, gw, total, gw / 2);
    this.ctx.fill();
    if (snapshot.garbageQueue <= 0) return;
    const seg = cellSize;
    const n = Math.min(rows, snapshot.garbageQueue);
    for (let i = 0; i < n; i++) {
      const segY = boardY + total - (i + 1) * seg + cellSize * 0.08;
      this.ctx.fillStyle = i >= 4 ? '#ef4444' : '#f59e0b';
      roundRect(this.ctx, gx, segY, gw, seg - cellSize * 0.16, gw / 2);
      this.ctx.fill();
    }
  }

  private drawPreviewCentered(
    piece: PiecePreview,
    panelX: number,
    panelY: number,
    panelW: number,
    panelH: number,
    size: number,
  ): void {
    const rows = piece.cells.length;
    const cols = piece.cells[0]?.length ?? 0;
    const ox = panelX + (panelW - cols * size) / 2;
    const oy = panelY + (panelH - rows * size) / 2;
    for (let r = 0; r < rows; r++) {
      const row = piece.cells[r];
      if (!row) continue;
      for (let cIdx = 0; cIdx < row.length; cIdx++) {
        const cell = row[cIdx];
        if (!cell || cell.type === 'empty') continue;
        drawCell(this.ctx, ox + cIdx * size, oy + r * size, size, colorOf(cell.id));
      }
    }
  }

  private drawPanel(x: number, y: number, w: number, h: number, header?: string): void {
    const theme = getTheme();
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(this.ctx, x, y, w, h, 8);
    this.ctx.fill();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = shade(theme.grid, 0.1);
    roundRect(this.ctx, x, y, w, h, 8);
    this.ctx.stroke();
    this.ctx.restore();
    if (header) {
      drawText(this.ctx, header, x + w / 2, y + 4, {
        color: theme.accent,
        size: Math.max(10, w * 0.16),
        bold: true,
        align: 'center',
      });
    }
  }
}
