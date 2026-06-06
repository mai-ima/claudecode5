import type { TetrisBoard } from './TetrisBoard';
import { pieceCells, rotatedPiece } from './piece';
import type { ActivePiece, KickResult, Rotation } from './types';

/**
 * Super Rotation System（SRS）の壁蹴り。
 *
 * 重要（座標系の注意）: 公開されている SRS キックテーブルは y が上方向に正だが、
 * 本実装は y が下方向に正。そのため全オフセットの dy 符号を反転して定義してある。
 */

type KickOffset = readonly [dx: number, dy: number];
type KickTable = Record<string, readonly KickOffset[]>;

const key = (from: Rotation, to: Rotation): string => `${from}>${to}`;

// 180 度回転用の共通キック候補（在place を最優先）。
const HUNDRED_EIGHTY = (): readonly KickOffset[] => [
  [0, 0],
  [0, -1],
  [0, 1],
  [1, 0],
  [-1, 0],
];

// JLSTZ 用キック（dy は下方向正に変換済み）。
const JLSTZ_KICKS: KickTable = {
  [key(0, 1)]: [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  [key(1, 0)]: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  [key(1, 2)]: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  [key(2, 1)]: [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  [key(2, 3)]: [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  [key(3, 2)]: [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  [key(3, 0)]: [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  [key(0, 3)]: [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  // 180 度回転（基本 SRS の拡張。在place を優先し近傍へ逃がす）。
  [key(0, 2)]: HUNDRED_EIGHTY(),
  [key(2, 0)]: HUNDRED_EIGHTY(),
  [key(1, 3)]: HUNDRED_EIGHTY(),
  [key(3, 1)]: HUNDRED_EIGHTY(),
};

// I 用キック（dy は下方向正に変換済み）。
const I_KICKS: KickTable = {
  [key(0, 1)]: [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  [key(1, 0)]: [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  [key(1, 2)]: [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  [key(2, 1)]: [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  [key(2, 3)]: [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  [key(3, 2)]: [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  [key(3, 0)]: [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  [key(0, 3)]: [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  [key(0, 2)]: HUNDRED_EIGHTY(),
  [key(2, 0)]: HUNDRED_EIGHTY(),
  [key(1, 3)]: HUNDRED_EIGHTY(),
  [key(3, 1)]: HUNDRED_EIGHTY(),
};

export interface RotationOutcome {
  piece: ActivePiece;
  kick: KickResult;
}

/**
 * 目標回転へ回そうと試みる。成功すれば新ピースと採用キックを返し、
 * 全候補が衝突すれば null。
 */
export function tryRotate(
  board: TetrisBoard,
  piece: ActivePiece,
  to: Rotation,
): RotationOutcome | null {
  // O は回転しても形が変わらない（キック不要）。
  if (piece.type === 'O') {
    const rotated = rotatedPiece(piece, to);
    if (!board.collides(pieceCells(rotated))) {
      return { piece: rotated, kick: { index: 0, dx: 0, dy: 0 } };
    }
    return null;
  }

  const table = piece.type === 'I' ? I_KICKS : JLSTZ_KICKS;
  const offsets = table[key(piece.rotation, to)];
  if (!offsets) return null;

  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    if (!offset) continue;
    const [dx, dy] = offset;
    const candidate: ActivePiece = { ...piece, rotation: to, x: piece.x + dx, y: piece.y + dy };
    if (!board.collides(pieceCells(candidate))) {
      return { piece: candidate, kick: { index: i, dx, dy } };
    }
  }
  return null;
}
