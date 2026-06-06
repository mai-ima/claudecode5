import type { Theme } from '../render/theme';

/**
 * プラグイン API（描画 / ストア限定）。
 *
 * 設計上の制約（レビュー反映）: プラグインはコアの落下/消去ロジックには介入しない。
 * 触れてよいのは「見た目（スキン/テーマ）」と「ストアに並ぶ商品」だけ。
 * これにより型崩壊や誤作動を防ぎ、堅牢性を保つ。
 */

/** 購入・装備できるスキン（テーマの差し替え）。 */
export interface Skin {
  id: string;
  name: string;
  /** 価格（ゲーム内通貨）。0 は無料/初期保有。 */
  price: number;
  theme: Theme;
}

/** プラグインが提供できる貢献物。 */
export interface Plugin {
  id: string;
  name: string;
  skins?: Skin[];
}
