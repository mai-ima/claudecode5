import { resolveChains } from './chain';
import type { PuyoBoard } from './PuyoBoard';
import { childOffset } from './types';
import type { PuyoOrientation, PuyoPair } from './types';

/**
 * 内蔵ぷよAI（アルゴリズム型）。各 (列, 向き) に置いて連鎖・盤面を評価し最良手を選ぶ。
 * 大連鎖は狙わず、消去で高さを抑えつつ生存する堅実なCPU。
 */

export interface PuyoPlacement {
  x: number;
  orientation: PuyoOrientation;
}

function columnHeights(board: PuyoBoard): number[] {
  const h: number[] = [];
  for (let x = 0; x < board.width; x++) {
    let top = board.height;
    for (let y = 0; y < board.height; y++) {
      if (board.raw(x, y) !== 0) {
        top = y;
        break;
      }
    }
    h.push(board.height - top);
  }
  return h;
}

function holes(board: PuyoBoard): number {
  let n = 0;
  for (let x = 0; x < board.width; x++) {
    let seen = false;
    for (let y = 0; y < board.height; y++) {
      if (board.raw(x, y) !== 0) seen = true;
      else if (seen) n++;
    }
  }
  return n;
}

/** クローン盤面に組ぷよを置く（落下まで）。置けなければ false。 */
function simulate(board: PuyoBoard, pair: PuyoPair, x: number, orientation: PuyoOrientation): boolean {
  const off = childOffset(orientation);
  if (off.dy === 0) {
    const cx = x + off.dx;
    if (x < 0 || x >= board.width || cx < 0 || cx >= board.width) return false;
    if (!board.isEmpty(x, 0) || !board.isEmpty(cx, 0)) return false;
    board.setColor(x, 0, pair.axisColor);
    board.setColor(cx, 0, pair.childColor);
  } else {
    if (x < 0 || x >= board.width) return false;
    if (!board.isEmpty(x, 0) || !board.isEmpty(x, 1)) return false;
    if (off.dy === -1) {
      board.setColor(x, 1, pair.axisColor);
      board.setColor(x, 0, pair.childColor);
    } else {
      board.setColor(x, 1, pair.childColor);
      board.setColor(x, 0, pair.axisColor);
    }
  }
  board.applyGravity();
  return true;
}

/** 最良の配置を返す（候補が無ければ null）。 */
export function bestPuyoPlacement(board: PuyoBoard, pair: PuyoPair): PuyoPlacement | null {
  let best: PuyoPlacement | null = null;
  let bestScore = -Infinity;

  for (const orientation of [0, 1, 2, 3] as PuyoOrientation[]) {
    for (let x = 0; x < board.width; x++) {
      const sim = board.clone();
      if (!simulate(sim, pair, x, orientation)) continue;
      const chain = resolveChains(sim);
      const heights = columnHeights(sim);
      const agg = heights.reduce((a, b) => a + b, 0);
      let bump = 0;
      for (let i = 0; i < heights.length - 1; i++) {
        bump += Math.abs((heights[i] as number) - (heights[i + 1] as number));
      }
      const score =
        6 * chain.chains +
        0.05 * chain.totalScore -
        0.5 * agg -
        1.5 * holes(sim) -
        0.3 * bump;
      if (score > bestScore) {
        bestScore = score;
        best = { x, orientation };
      }
    }
  }
  return best;
}
