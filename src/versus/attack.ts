import type { TSpinResult } from '../modes/tetris/types';

/**
 * テトリスのライン消去から相手へ送るおじゃま行数を計算する。
 * （ぷよのおじゃまは PuyoEngine 側で連鎖スコアから算出する。）
 */
const NORMAL = [0, 0, 1, 2, 4];
const TSPIN = [0, 2, 4, 6];
const TSPIN_MINI = [0, 0, 1];

export interface TetrisAttackInput {
  lines: number;
  tspin: TSpinResult;
  combo: number;
  backToBack: boolean;
}

export function tetrisAttack(input: TetrisAttackInput): number {
  const { lines, tspin, combo, backToBack } = input;
  if (lines <= 0) return 0;

  let base: number;
  if (tspin === 'full') base = TSPIN[lines] ?? 6;
  else if (tspin === 'mini') base = TSPIN_MINI[lines] ?? 1;
  else base = NORMAL[lines] ?? 4;

  // Back-to-Back ボーナス。
  if (backToBack && (lines === 4 || tspin !== 'none')) base += 1;

  // Combo ボーナス（緩やかに加算）。
  if (combo > 1) base += Math.floor((combo - 1) / 2);

  return base;
}
