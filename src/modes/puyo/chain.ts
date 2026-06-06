import { PuyoBoard } from './PuyoBoard';
import type { PuyoColor } from './types';

/** 連結消去の最小数。 */
export const CLEAR_THRESHOLD = 4;

interface Cell {
  x: number;
  y: number;
}

const CHAIN_POWER = [0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512];
const COLOR_BONUS = [0, 0, 3, 6, 12, 24];
const GROUP_BONUS = [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10];

function chainPower(chain: number): number {
  return CHAIN_POWER[chain] ?? 512 + (chain - 19) * 32;
}
function groupBonus(size: number): number {
  return GROUP_BONUS[size] ?? 10;
}

/** 同色 4 個以上の連結グループを列挙する（おじゃまは除外）。 */
export function findClearGroups(board: PuyoBoard): Cell[][] {
  const visited = new Uint8Array(board.width * board.height);
  const groups: Cell[][] = [];

  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const idx = y * board.width + x;
      if (visited[idx]) continue;
      const color = board.idAt(x, y);
      if (color === null || color === 'garbage') {
        visited[idx] = 1;
        continue;
      }
      const group = floodFill(board, x, y, color, visited);
      if (group.length >= CLEAR_THRESHOLD) groups.push(group);
    }
  }
  return groups;
}

function floodFill(
  board: PuyoBoard,
  sx: number,
  sy: number,
  color: PuyoColor | 'garbage',
  visited: Uint8Array,
): Cell[] {
  const out: Cell[] = [];
  const stack: Cell[] = [{ x: sx, y: sy }];
  visited[sy * board.width + sx] = 1;
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  while (stack.length) {
    const cell = stack.pop() as Cell;
    out.push(cell);
    for (const [dx, dy] of dirs) {
      const nx = cell.x + (dx as number);
      const ny = cell.y + (dy as number);
      if (!board.inBounds(nx, ny)) continue;
      const idx = ny * board.width + nx;
      if (visited[idx]) continue;
      if (board.idAt(nx, ny) === color) {
        visited[idx] = 1;
        stack.push({ x: nx, y: ny });
      }
    }
  }
  return out;
}

export interface ChainStep {
  chain: number;
  clearedPuyos: number;
  score: number;
  groups: number;
}

export interface ChainResult {
  chains: number;
  totalScore: number;
  totalCleared: number;
  steps: ChainStep[];
}

/**
 * 1 連鎖ぶんの消去を実行する（落下は呼び出し側で事前に行う前提）。
 * 消すものが無ければ null。ステップ単位なのでアニメーションに使える。
 */
export function clearOnce(board: PuyoBoard, chainIndex: number): ChainStep | null {
  const groups = findClearGroups(board);
  if (groups.length === 0) return null;

  const toClear = new Set<number>();
  const colors = new Set<PuyoColor>();
  let colorCleared = 0;
  for (const group of groups) {
    for (const cell of group) {
      toClear.add(cell.y * board.width + cell.x);
      colorCleared++;
      const id = board.idAt(cell.x, cell.y);
      if (id && id !== 'garbage') colors.add(id);
    }
  }
  // 隣接おじゃまも消す。
  for (const group of groups) {
    for (const cell of group) {
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const nx = cell.x + (dx as number);
        const ny = cell.y + (dy as number);
        if (board.isGarbage(nx, ny)) toClear.add(ny * board.width + nx);
      }
    }
  }

  const cb = COLOR_BONUS[Math.min(colors.size, 5)] ?? 24;
  let gb = 0;
  for (const group of groups) gb += groupBonus(group.length);
  const power = Math.max(1, chainPower(chainIndex) + cb + gb);
  const stepScore = 10 * colorCleared * power;

  for (const idx of toClear) {
    board.clearCell(idx % board.width, Math.floor(idx / board.width));
  }

  return { chain: chainIndex, clearedPuyos: toClear.size, score: stepScore, groups: groups.length };
}

/**
 * 連鎖を最後まで解決する（テストや一括処理用）。
 * 落下 → 消去 → 落下 …を繰り返す。
 */
export function resolveChains(board: PuyoBoard): ChainResult {
  const result: ChainResult = { chains: 0, totalScore: 0, totalCleared: 0, steps: [] };
  board.applyGravity();
  for (;;) {
    const step = clearOnce(board, result.chains + 1);
    if (!step) break;
    result.chains++;
    result.totalScore += step.score;
    result.totalCleared += step.clearedPuyos;
    result.steps.push(step);
    board.applyGravity();
  }
  return result;
}

/** スコアから送るおじゃまぷよ数を計算する（target=70）。 */
export function garbageFromScore(score: number, target = 70): number {
  return Math.floor(score / target);
}
