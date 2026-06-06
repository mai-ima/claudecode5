import { BASE_CELL_SIZE, BOARD_WIDTH, VISIBLE_HEIGHT } from '../config/constants';

/**
 * 罠対策(3): セルサイズを固定せず、利用可能な画面サイズから動的に算出する。
 * 1P でも 2P でも盤面 + サイドパネルが収まるようにする。
 */

/** サイドパネルが占めるセル換算の幅（左: hold, 右: next/hud）。 */
export const LEFT_PANEL_CELLS = 5;
export const RIGHT_PANEL_CELLS = 5.5;

export interface BoardLayout {
  cellSize: number;
  /** 盤面描画の左上原点。 */
  boardX: number;
  boardY: number;
  /** 全体（パネル込み）の幅・高さ。 */
  totalWidth: number;
  totalHeight: number;
}

/**
 * 1 つの盤面（パネル込み）のレイアウトを、与えられた利用可能領域に対して算出する。
 * @param count 横に並べる盤面数（1P=1, 2P=2）。
 */
export function computeCellSize(availWidth: number, availHeight: number, count = 1): number {
  const colsPerBoard = BOARD_WIDTH + LEFT_PANEL_CELLS + RIGHT_PANEL_CELLS;
  const totalCols = colsPerBoard * count + (count - 1) * 1; // 盤面間に 1 セルの余白。
  const byWidth = availWidth / totalCols;
  const byHeight = availHeight / (VISIBLE_HEIGHT + 1); // 上下に少し余白。
  return Math.max(8, Math.min(BASE_CELL_SIZE, Math.floor(Math.min(byWidth, byHeight))));
}

/** 単一盤面のレイアウトを作る。 */
export function singleBoardLayout(availWidth: number, availHeight: number): BoardLayout {
  const cellSize = computeCellSize(availWidth, availHeight, 1);
  const boardPxH = VISIBLE_HEIGHT * cellSize;
  const totalWidth = (BOARD_WIDTH + LEFT_PANEL_CELLS + RIGHT_PANEL_CELLS) * cellSize;
  const totalHeight = boardPxH + cellSize;
  const boardX = LEFT_PANEL_CELLS * cellSize;
  const boardY = cellSize * 0.5;
  return { cellSize, boardX, boardY, totalWidth, totalHeight };
}
