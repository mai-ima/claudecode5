/**
 * ゲーム全体で共有する基準定数。マジックナンバーはここに集約する。
 *
 * 注意（罠対策3）: ピクセル単位のセルサイズはここで「基準値」だけを持ち、
 * 実際の描画サイズは render/layout.ts が画面サイズから動的に算出する。
 */

/** プレイフィールドの幅（列数）。 */
export const BOARD_WIDTH = 10;

/** 表示される高さ（行数）。 */
export const VISIBLE_HEIGHT = 20;

/** 盤面上部のバッファ行数（スポーンと縦キック用）。 */
export const BUFFER_HEIGHT = 20;

/** 内部的に保持する盤面の総高さ。 */
export const TOTAL_HEIGHT = VISIBLE_HEIGHT + BUFFER_HEIGHT;

/** Next プレビューの表示数。 */
export const NEXT_COUNT = 5;

/** 描画基準のセルサイズ（px）。layout がこれを上限に縮小する。 */
export const BASE_CELL_SIZE = 30;

/** 入力タイミング（ミリ秒）。 */
export const TIMING = {
  /** Delayed Auto Shift: 横移動の自動連射が始まるまでの遅延。 */
  das: 133,
  /** Auto Repeat Rate: 自動連射の間隔。 */
  arr: 33,
  /** ソフトドロップ 1 セルあたりの間隔。 */
  softDropInterval: 20,
  /** 接地後にロックされるまでの猶予。 */
  lockDelay: 500,
  /** ロックディレイのリセット回数上限（無限固定防止）。 */
  lockResetLimit: 15,
  /** ライン消去アニメーションの長さ。 */
  lineClearDelay: 200,
} as const;

/** 1 論理ステップの長さ（固定タイムステップ, ms）。 */
export const STEP_MS = 1000 / 60;
