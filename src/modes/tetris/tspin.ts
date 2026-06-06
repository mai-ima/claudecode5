import type { TetrisBoard } from './TetrisBoard';
import type { ActivePiece, KickResult, TSpinResult } from './types';

/**
 * T-Spin 判定（3 コーナールール）。
 *
 * - T ピース以外、または直前のアクションが回転でない場合は 'none'。
 * - T の 3x3 ボックスの 4 隅のうち占有数を数える（盤外は占有扱い）。
 * - 3 隅以上占有かつ「前方 2 隅」が両方占有なら full、そうでなければ mini。
 * - キック例外: 5 番目のキック（index 4）が採用された場合は mini を full に昇格。
 */

// 回転状態ごとの「前方 2 隅」（ボックス内ローカル座標）。
const FRONT_CORNERS: Record<number, [number, number][]> = {
  0: [
    [0, 0],
    [2, 0],
  ],
  1: [
    [2, 0],
    [2, 2],
  ],
  2: [
    [0, 2],
    [2, 2],
  ],
  3: [
    [0, 0],
    [0, 2],
  ],
};

const ALL_CORNERS: [number, number][] = [
  [0, 0],
  [2, 0],
  [0, 2],
  [2, 2],
];

export function detectTSpin(
  board: TetrisBoard,
  piece: ActivePiece,
  lastActionWasRotation: boolean,
  lastKick: KickResult | null,
): TSpinResult {
  if (piece.type !== 'T' || !lastActionWasRotation) return 'none';

  const occupied = (lx: number, ly: number): boolean =>
    !board.isEmptyAt(piece.x + lx, piece.y + ly);

  const total = ALL_CORNERS.filter(([lx, ly]) => occupied(lx, ly)).length;
  if (total < 3) return 'none';

  const front = FRONT_CORNERS[piece.rotation] ?? [];
  const frontFilled = front.filter(([lx, ly]) => occupied(lx, ly)).length;

  if (frontFilled === 2) return 'full';

  // キック例外: 最終キック（index 4）で入った T-Spin は full 扱い。
  if (lastKick && lastKick.index === 4) return 'full';

  return 'mini';
}
