import type { TetrisRuleSet } from '../modes/tetris/ruleset';
import type { MinoSkin, Theme } from '../render/theme';

/**
 * アドオン（本家プリセット）。UIスタイル・ミノスキン・メカニクス（RuleSet）を束ね、
 * 「本家ごとの再現」を 1 つの選択で切り替える。
 */
export interface Addon {
  id: string;
  name: string;
  description: string;
  uiStyle: Theme;
  minoSkin: MinoSkin;
  /** テトリス挙動の上書き（未指定は既定＝ガイドライン）。 */
  tetrisRules?: Partial<TetrisRuleSet>;
}
