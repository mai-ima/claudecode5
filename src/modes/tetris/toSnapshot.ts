import { BUFFER_HEIGHT, VISIBLE_HEIGHT } from '../../config/constants';
import type {
  CellId,
  HudInfo,
  PiecePreview,
  RenderCell,
  Snapshot,
} from '../../shared/snapshot';
import { emptyCell } from '../../shared/snapshot';
import { pieceCells } from './piece';
import { shapeCells } from './tetromino';
import type { TetrisBoard } from './TetrisBoard';
import type { ActivePiece, PieceType } from './types';

export interface SnapshotInput {
  board: TetrisBoard;
  active: ActivePiece | null;
  ghost: ActivePiece | null;
  holdType: PieceType | null;
  nextTypes: PieceType[];
  clearingRows: number[];
  hud: HudInfo;
  garbageQueue: number;
  phase: Snapshot['phase'];
}

/** 内部状態を描画用 Snapshot へ変換する。 */
export function buildSnapshot(input: SnapshotInput): Snapshot {
  const { board, active, ghost, clearingRows } = input;
  const clearing = new Set(clearingRows);

  // 可視領域のグリッドを構築。
  const grid: RenderCell[][] = [];
  for (let row = 0; row < VISIBLE_HEIGHT; row++) {
    const boardY = row + BUFFER_HEIGHT;
    const line: RenderCell[] = [];
    for (let x = 0; x < board.width; x++) {
      const id = board.idAt(x, boardY);
      if (id) {
        line.push({
          id: id as CellId,
          type: id === 'garbage' ? 'garbage' : 'block',
          ...(clearing.has(boardY) ? { state: 'clearing' as const } : {}),
        });
      } else {
        line.push(emptyCell());
      }
    }
    grid.push(line);
  }

  // ゴーストを重ねる（ブロックがない箇所のみ）。
  if (ghost) {
    for (const cell of pieceCells(ghost)) {
      const row = cell.y - BUFFER_HEIGHT;
      if (row >= 0 && row < VISIBLE_HEIGHT && cell.x >= 0 && cell.x < board.width) {
        const target = grid[row]?.[cell.x];
        if (target && target.type === 'empty') {
          grid[row]![cell.x] = { id: ghost.type, type: 'ghost' };
        }
      }
    }
  }

  // アクティブピースを重ねる。
  if (active) {
    for (const cell of pieceCells(active)) {
      const row = cell.y - BUFFER_HEIGHT;
      if (row >= 0 && row < VISIBLE_HEIGHT && cell.x >= 0 && cell.x < board.width) {
        grid[row]![cell.x] = { id: active.type, type: 'block' };
      }
    }
  }

  return {
    grid,
    next: input.nextTypes.map(pieceToPreview),
    hold: input.holdType ? pieceToPreview(input.holdType) : null,
    hud: input.hud,
    garbageQueue: input.garbageQueue,
    phase: input.phase,
  };
}

/** ピース種を小さなプレビューグリッドに変換（回転 0 をトリミング）。 */
export function pieceToPreview(type: PieceType): PiecePreview {
  const cells = shapeCells(type, 0);
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  const grid: RenderCell[][] = [];
  for (let row = 0; row < h; row++) {
    grid.push(Array.from({ length: w }, emptyCell));
  }
  for (const cell of cells) {
    grid[cell.y - minY]![cell.x - minX] = { id: type, type: 'block' };
  }
  return { cells: grid };
}
