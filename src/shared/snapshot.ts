/**
 * モード間で共有する「描画用スナップショット」の契約。
 *
 * 重要な設計判断:
 * - セルは生のカラーコードを持たず、論理 ID のみを持つ。
 *   実際の色やテクスチャへの変換は描画層（theme / スキンプラグイン）が行う。
 *   これによりスキン差し替えがエンジンに影響しない。
 * - ゴーストやぷよの明滅など、特殊な見た目は `type` と `state` で表現する。
 */

/** セルの論理 ID。テトリスのミノ種・ぷよの色・おじゃま・空など。 */
export type CellId =
  | 'empty'
  | 'I'
  | 'O'
  | 'T'
  | 'S'
  | 'Z'
  | 'J'
  | 'L'
  | 'garbage'
  | 'puyo-red'
  | 'puyo-green'
  | 'puyo-blue'
  | 'puyo-yellow'
  | 'puyo-purple';

/** 描画用の 1 セル。色ではなく論理 ID を持つ。 */
export interface RenderCell {
  /** 論理 ID（描画層が色/テクスチャへ変換）。 */
  id: CellId;
  /** 見た目のカテゴリ。半透明や特殊描画の切り替えに使う。 */
  type: 'empty' | 'block' | 'ghost' | 'puyo' | 'garbage';
  /** 一時的な状態（例: 'clearing' で明滅）。任意。 */
  state?: 'clearing' | 'landing';
}

/** Next / Hold プレビュー用の小さなピース表現（セル配列）。 */
export interface PiecePreview {
  cells: RenderCell[][];
}

/** HUD（スコア等）の表示情報。 */
export interface HudInfo {
  score: number;
  level: number;
  lines: number;
  combo: number;
  backToBack: boolean;
  /** 直近の特殊アクション表示（T-Spin など）。 */
  lastClearLabel?: string;
}

/** 1 フレームの完全な描画用状態。Renderer はこれだけを見る。 */
export interface Snapshot {
  /** 盤面の可視列数（テトリス=10, ぷよ=6）。 */
  cols: number;
  /** 盤面の可視行数（テトリス=20, ぷよ=12）。 */
  rows: number;
  /** 表示用グリッド（行優先、上が y=0）。 */
  grid: RenderCell[][];
  /** Next キュー（先頭が次）。 */
  next: PiecePreview[];
  /** Hold（無ければ null）。 */
  hold: PiecePreview | null;
  /** HUD 情報。 */
  hud: HudInfo;
  /** 次に降ってくる予定のおじゃま量（予告ゲージ）。対戦/観戦で使用。 */
  garbageQueue: number;
  /** ゲーム進行フェーズ。 */
  phase: 'ready' | 'playing' | 'paused' | 'gameover';
}

/** 空セルを 1 つ作るヘルパー。 */
export function emptyCell(): RenderCell {
  return { id: 'empty', type: 'empty' };
}
