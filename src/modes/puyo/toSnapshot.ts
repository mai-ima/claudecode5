import { PUYO_BUFFER, PUYO_VISIBLE_HEIGHT } from './PuyoBoard';
import type { PuyoBoard } from './PuyoBoard';
import type { CellId, HudInfo, PiecePreview, RenderCell, Snapshot } from '../../shared/snapshot';
import { emptyCell } from '../../shared/snapshot';
import { childOffset } from './types';
import type { PuyoColor, PuyoPair } from './types';

export function colorToId(color: PuyoColor): CellId {
  return `puyo-${color}` as CellId;
}

export interface PuyoSnapshotInput {
  board: PuyoBoard;
  active: PuyoPair | null;
  ghost: PuyoPair | null;
  nextPairs: Array<{ axisColor: PuyoColor; childColor: PuyoColor }>;
  clearing: Set<number>;
  hud: HudInfo;
  garbageQueue: number;
  phase: Snapshot['phase'];
}

export function buildPuyoSnapshot(input: PuyoSnapshotInput): Snapshot {
  const { board, active, ghost, clearing } = input;
  const grid: RenderCell[][] = [];

  for (let row = 0; row < PUYO_VISIBLE_HEIGHT; row++) {
    const boardY = row + PUYO_BUFFER;
    const line: RenderCell[] = [];
    for (let x = 0; x < board.width; x++) {
      const id = board.idAt(x, boardY);
      if (id) {
        const isGarbage = id === 'garbage';
        line.push({
          id: isGarbage ? 'garbage' : colorToId(id),
          type: isGarbage ? 'garbage' : 'puyo',
          ...(clearing.has(boardY * board.width + x) ? { state: 'clearing' as const } : {}),
        });
      } else {
        line.push(emptyCell());
      }
    }
    grid.push(line);
  }

  if (ghost) overlayPair(grid, board.width, ghost, true);
  if (active) overlayPair(grid, board.width, active, false);

  return {
    grid,
    next: input.nextPairs.map(pairPreview),
    hold: null,
    hud: input.hud,
    garbageQueue: input.garbageQueue,
    phase: input.phase,
  };
}

function overlayPair(grid: RenderCell[][], width: number, pair: PuyoPair, ghost: boolean): void {
  const off = childOffset(pair.orientation);
  const cells: Array<{ x: number; y: number; color: PuyoColor }> = [
    { x: pair.x, y: pair.y, color: pair.axisColor },
    { x: pair.x + off.dx, y: pair.y + off.dy, color: pair.childColor },
  ];
  for (const cell of cells) {
    const row = cell.y - PUYO_BUFFER;
    if (row < 0 || row >= grid.length || cell.x < 0 || cell.x >= width) continue;
    const existing = grid[row]?.[cell.x];
    if (ghost && existing && existing.type !== 'empty') continue;
    grid[row]![cell.x] = { id: colorToId(cell.color), type: ghost ? 'ghost' : 'puyo' };
  }
}

function pairPreview(pair: { axisColor: PuyoColor; childColor: PuyoColor }): PiecePreview {
  return {
    cells: [
      [{ id: colorToId(pair.childColor), type: 'puyo' }],
      [{ id: colorToId(pair.axisColor), type: 'puyo' }],
    ],
  };
}
