import { NEXT_COUNT, TIMING } from '../../config/constants';
import { framesPerCell, SOFT_DROP_GRAVITY_FACTOR } from '../../config/scoring';

/**
 * 本家ごとに差し替え可能なテトリスのルールセット（メカニクス精密化の核）。
 * エンジンへ注入し、プリセット/アドオンが本家挙動を再現する。
 */
export type RotationSystem = 'srs' | 'classic';
export type SpinMode = 'none' | 'tspin' | 'allspin';

export interface Handling {
  das: number;
  arr: number;
}

export interface TetrisRuleSet {
  /** 入力ハンドリング（入力層が参照）。 */
  handling: Handling;
  /** 接地後ロックまでの猶予(ms)。 */
  lockDelay: number;
  /** ロックディレイのリセット上限。 */
  lockResetLimit: number;
  /** ライン消去アニメーション(ms)。 */
  lineClearDelay: number;
  /** ネクスト表示数。 */
  nextCount: number;
  /** ソフトドロップを即着地(40G)にする。 */
  softDrop40G: boolean;
  /** ソフトドロップの重力倍率。 */
  softDropFactor: number;
  /** 回転システム。 */
  rotationSystem: RotationSystem;
  /** 180度回転の可否。 */
  allow180: boolean;
  /** スピン判定方式。 */
  spinMode: SpinMode;
  /** レベルとソフト状態から 1 セル落下間隔(ms)を返す。 */
  gravityMs(level: number, soft: boolean): number;
}

export const DEFAULT_RULESET: TetrisRuleSet = {
  handling: { das: TIMING.das, arr: TIMING.arr },
  lockDelay: TIMING.lockDelay,
  lockResetLimit: TIMING.lockResetLimit,
  lineClearDelay: TIMING.lineClearDelay,
  nextCount: NEXT_COUNT,
  softDrop40G: false,
  softDropFactor: SOFT_DROP_GRAVITY_FACTOR,
  rotationSystem: 'srs',
  allow180: true,
  spinMode: 'tspin',
  gravityMs(level: number, soft: boolean): number {
    const ms = framesPerCell(level) * (1000 / 60);
    if (soft) return this.softDrop40G ? 0 : Math.max(1, ms / this.softDropFactor);
    return ms;
  },
};

/** 既定値に部分上書きしてルールセットを作る。 */
export function makeRuleSet(partial?: Partial<TetrisRuleSet>): TetrisRuleSet {
  return { ...DEFAULT_RULESET, ...(partial ?? {}) };
}
