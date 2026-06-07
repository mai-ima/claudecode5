import { BASE_CELL_SIZE, BOARD_WIDTH, VISIBLE_HEIGHT } from '../config/constants';

/**
 * 罠対策(3): セルサイズを固定せず、利用可能な画面サイズから動的に算出する。
 * 盤面の寸法（cols/rows）はモードごとに異なる（テトリス10x20 / ぷよ6x12）ため、
 * 固定値ではなく引数で受け取る。
 */

/** サイドパネルが占めるセル換算の幅（左: hold/stats, 右: next）。 */
export const LEFT_PANEL_CELLS = 5;
export const RIGHT_PANEL_CELLS = 5.5;

export interface BoardLayout {
  cellSize: number;
  /** 盤面描画の左上原点。 */
  boardX: number;
  boardY: number;
  /** 盤面の可視列数・行数。 */
  cols: number;
  rows: number;
  /** 全体（パネル込み）の幅・高さ。 */
  totalWidth: number;
  totalHeight: number;
}

/**
 * セルサイズを算出する。
 * @param count 横に並べる盤面数（1P=1, 2P=2）。
 */
export function computeCellSize(
  availWidth: number,
  availHeight: number,
  count = 1,
  cols = BOARD_WIDTH,
  rows = VISIBLE_HEIGHT,
): number {
  const colsPerBoard = cols + LEFT_PANEL_CELLS + RIGHT_PANEL_CELLS;
  const totalCols = colsPerBoard * count + (count - 1) * 1; // 盤面間に 1 セルの余白。
  const byWidth = availWidth / totalCols;
  const byHeight = availHeight / (rows + 1); // 上下に少し余白。
  return Math.max(8, Math.min(BASE_CELL_SIZE, Math.floor(Math.min(byWidth, byHeight))));
}

/** 単一盤面のレイアウトを作る。 */
export function singleBoardLayout(
  availWidth: number,
  availHeight: number,
  cols = BOARD_WIDTH,
  rows = VISIBLE_HEIGHT,
): BoardLayout {
  return multiBoardLayout(availWidth, availHeight, 1, cols, rows).boards[0] as BoardLayout;
}

export interface MultiLayout {
  cellSize: number;
  totalWidth: number;
  totalHeight: number;
  boards: BoardLayout[];
}

/** 複数盤面（対戦）のレイアウトを作る。 */
export function multiBoardLayout(
  availWidth: number,
  availHeight: number,
  count: number,
  cols = BOARD_WIDTH,
  rows = VISIBLE_HEIGHT,
): MultiLayout {
  const cellSize = computeCellSize(availWidth, availHeight, count, cols, rows);
  const colsPerBoard = cols + LEFT_PANEL_CELLS + RIGHT_PANEL_CELLS;
  const boardPxH = rows * cellSize;
  const totalHeight = boardPxH + cellSize;
  const totalWidth = (colsPerBoard * count + (count - 1)) * cellSize;
  const boardY = cellSize * 0.5;

  const boards: BoardLayout[] = [];
  for (let i = 0; i < count; i++) {
    const originCols = i * (colsPerBoard + 1) + LEFT_PANEL_CELLS;
    boards.push({
      cellSize,
      boardX: originCols * cellSize,
      boardY,
      cols,
      rows,
      totalWidth: colsPerBoard * cellSize,
      totalHeight,
    });
  }
  return { cellSize, totalWidth, totalHeight, boards };
}
