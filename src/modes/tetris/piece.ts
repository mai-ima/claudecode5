import { BUFFER_HEIGHT } from '../../config/constants';
import { SPAWN_X, shapeCells } from './tetromino';
import type { ActivePiece, Cell, PieceType, Rotation } from './types';

/** スポーン時の原点 Y（最下行が可視領域上端に来る位置）。 */
const SPAWN_Y = BUFFER_HEIGHT - 1;

/** 新しいアクティブピースを生成する。 */
export function spawnPiece(type: PieceType): ActivePiece {
  return { type, rotation: 0, x: SPAWN_X[type], y: SPAWN_Y };
}

/** ピースの絶対セル座標（盤面座標）を返す。 */
export function pieceCells(piece: ActivePiece): Cell[] {
  return shapeCells(piece.type, piece.rotation).map((cell) => ({
    x: cell.x + piece.x,
    y: cell.y + piece.y,
  }));
}

/** 平行移動した新しいピースを返す（純粋関数）。 */
export function movedPiece(piece: ActivePiece, dx: number, dy: number): ActivePiece {
  return { ...piece, x: piece.x + dx, y: piece.y + dy };
}

/** 回転状態だけ変えた新しいピースを返す（位置はキック前のまま）。 */
export function rotatedPiece(piece: ActivePiece, rotation: Rotation): ActivePiece {
  return { ...piece, rotation };
}

/** 時計回りの次の回転状態。 */
export function cw(rotation: Rotation): Rotation {
  return ((rotation + 1) % 4) as Rotation;
}

/** 反時計回りの次の回転状態。 */
export function ccw(rotation: Rotation): Rotation {
  return ((rotation + 3) % 4) as Rotation;
}

/** 180 度回転後の状態。 */
export function flip(rotation: Rotation): Rotation {
  return ((rotation + 2) % 4) as Rotation;
}
