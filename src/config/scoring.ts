/**
 * テトリス・ガイドライン準拠のスコア / レベル / 重力データ。
 * 計算ロジックは modes/tetris/scoring.ts、本ファイルは「データ」のみを持つ。
 */

/** ライン消去の基本点（レベル 1 換算、消去ライン数ごと）。 */
export const LINE_CLEAR_BASE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

/** T-Spin のボーナス点（消去ライン数ごと）。 */
export const TSPIN_BASE: Record<number, number> = {
  0: 400,
  1: 800,
  2: 1200,
  3: 1600,
};

/** T-Spin Mini のボーナス点（消去ライン数ごと）。 */
export const TSPIN_MINI_BASE: Record<number, number> = {
  0: 100,
  1: 200,
  2: 400,
};

/** ソフトドロップ 1 セルあたりの点。 */
export const SOFT_DROP_POINT = 1;

/** ハードドロップ 1 セルあたりの点。 */
export const HARD_DROP_POINT = 2;

/** Back-to-Back の倍率（難消去の連続）。 */
export const BACK_TO_BACK_MULTIPLIER = 1.5;

/** Combo 1 段あたりの加点（レベル換算）。 */
export const COMBO_BASE = 50;

/** レベルアップに必要な累計ライン数（レベル N で N*10 ライン）。 */
export function linesToLevelUp(level: number): number {
  return level * 10;
}

/**
 * レベルごとの重力（1 セル落下に要するフレーム数, 60fps 基準）。
 * 公式ガイドラインの落下式に基づく近似値。
 */
export function framesPerCell(level: number): number {
  const lv = Math.max(1, level);
  // (0.8 - (level-1)*0.007) ^ (level-1) 秒/セル を frame 数へ変換。
  const secondsPerCell = Math.pow(0.8 - (lv - 1) * 0.007, lv - 1);
  return Math.max(1, secondsPerCell * 60);
}

/** ソフトドロップ時の重力倍率。 */
export const SOFT_DROP_GRAVITY_FACTOR = 20;
