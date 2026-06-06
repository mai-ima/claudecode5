import {
  BACK_TO_BACK_MULTIPLIER,
  COMBO_BASE,
  LINE_CLEAR_BASE,
  TSPIN_BASE,
  TSPIN_MINI_BASE,
} from '../../config/scoring';
import type { TSpinResult } from './types';

export interface ScoreContext {
  level: number;
  /** 連鎖（combo）数。最初の消去で 0。 */
  combo: number;
  /** 直前が Back-to-Back 対象だったか。 */
  backToBack: boolean;
}

export interface LockScoreInput {
  linesCleared: number;
  tspin: TSpinResult;
}

export interface LockScoreResult {
  /** 加算スコア。 */
  points: number;
  /** 今回が Back-to-Back 対象（テトリス or T-Spin 消去）だったか。 */
  isDifficult: boolean;
  /** 表示用ラベル（"T-Spin Double" 等）。無ければ undefined。 */
  label?: string;
}

/** ライン消去 + T-Spin + Combo + B2B のスコアを計算する。 */
export function computeLockScore(
  input: LockScoreInput,
  ctx: ScoreContext,
): LockScoreResult {
  const { linesCleared, tspin } = input;
  const level = Math.max(1, ctx.level);

  let base = 0;
  let label: string | undefined;
  let isDifficult = false;

  if (tspin === 'full') {
    base = TSPIN_BASE[linesCleared] ?? 0;
    isDifficult = true;
    label = `T-Spin${lineSuffix(linesCleared)}`;
  } else if (tspin === 'mini') {
    base = TSPIN_MINI_BASE[linesCleared] ?? 0;
    isDifficult = true;
    label = `T-Spin Mini${lineSuffix(linesCleared)}`;
  } else if (linesCleared > 0) {
    base = LINE_CLEAR_BASE[linesCleared] ?? 0;
    if (linesCleared === 4) {
      isDifficult = true;
      label = 'Tetris';
    } else {
      label = `${linesCleared} Line${linesCleared > 1 ? 's' : ''}`;
    }
  }

  let points = base * level;

  // Back-to-Back: 難消去が連続したら 1.5 倍。
  if (isDifficult && ctx.backToBack && base > 0) {
    points = Math.floor(points * BACK_TO_BACK_MULTIPLIER);
  }

  // Combo: 2 連続目以降に加点。
  if (linesCleared > 0 && ctx.combo > 0) {
    points += COMBO_BASE * ctx.combo * level;
  }

  return label === undefined ? { points, isDifficult } : { points, isDifficult, label };
}

function lineSuffix(lines: number): string {
  switch (lines) {
    case 1:
      return ' Single';
    case 2:
      return ' Double';
    case 3:
      return ' Triple';
    default:
      return '';
  }
}
