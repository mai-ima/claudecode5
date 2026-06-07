import type { TetrisBoard } from './TetrisBoard';
import { movedPiece, pieceCells } from './piece';
import { detectTSpin } from './tspin';
import type { ActivePiece, KickResult, TSpinResult } from './types';
import type { SpinMode } from './ruleset';

/**
 * ピースが上下左右いずれにも動けない（immobile）か。all-spin 判定に使う。
 * 盤面はロック直前（ピース未配置）の状態を渡す。
 */
export function isImmobile(board: TetrisBoard, piece: ActivePiece): boolean {
  const dirs: Array<[number, number]> = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  return dirs.every(([dx, dy]) => board.collides(pieceCells(movedPiece(piece, dx, dy))));
}

/**
 * スピン判定（ルールのモードに従う）。
 * - 'none': 無効
 * - 'tspin': 3コーナールール（T のみ）
 * - 'allspin': 直前が回転かつ immobile なら spin（全ピース対象）
 */
export function detectSpin(
  board: TetrisBoard,
  piece: ActivePiece,
  mode: SpinMode,
  lastActionWasRotation: boolean,
  lastKick: KickResult | null,
): TSpinResult {
  if (mode === 'none' || !lastActionWasRotation) return 'none';
  if (mode === 'tspin') return detectTSpin(board, piece, lastActionWasRotation, lastKick);
  // allspin
  if (isImmobile(board, piece)) return 'full';
  return 'none';
}
