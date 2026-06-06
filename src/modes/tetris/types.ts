/** テトリス専用のドメイン型。 */

/** 7 種のテトロミノ。 */
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const PIECE_TYPES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** 回転状態。0=初期, 1=右(CW), 2=180, 3=左(CCW)。 */
export type Rotation = 0 | 1 | 2 | 3;

/** 盤面上の座標（x=列, y=行, y は下方向が正）。 */
export interface Cell {
  x: number;
  y: number;
}

/** アクティブなピース。 */
export interface ActivePiece {
  type: PieceType;
  rotation: Rotation;
  /** ピース原点の盤面座標。 */
  x: number;
  y: number;
}

/** SRS キックの結果情報（T-Spin 判定で使用）。 */
export interface KickResult {
  /** 採用されたキック候補のインデックス（0 始まり）。 */
  index: number;
  dx: number;
  dy: number;
}

/** T-Spin 判定結果。 */
export type TSpinResult = 'none' | 'mini' | 'full';

/**
 * テトリス専用の操作インテント。
 * Hold / HardDrop はテトリス固有（ぷよには存在しない）。
 */
export type TetrisIntent =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'rotate180'
  | 'hold'
  | 'pause';
