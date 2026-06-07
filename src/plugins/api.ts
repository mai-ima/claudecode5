import type { MinoSkin } from '../render/theme';

/**
 * プラグイン API（描画 / ストア限定）。
 *
 * 設計上の制約（レビュー反映）: プラグインはコアの落下/消去ロジックには介入しない。
 * 触れてよいのは「ミノ（ブロック）の見た目（スキン）」と「ストアに並ぶ商品」だけ。
 * UI（背景/枠/配色）は本家相当で固定し、スキンでは変更しない。
 */

/** 購入・装備できるミノスキン（価格付き）。 */
export interface Skin extends MinoSkin {
  /** 価格（ゲーム内通貨）。0 は無料/初期保有。 */
  price: number;
}

/** プラグインが提供できる貢献物。 */
export interface Plugin {
  id: string;
  name: string;
  skins?: Skin[];
}
