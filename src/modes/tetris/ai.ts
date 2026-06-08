import { pieceCells } from './piece';
import type { TetrisBoard } from './TetrisBoard';
import type { ActivePiece, PieceType, Rotation } from './types';

/**
 * 内蔵テトリスAI（アルゴリズム型・外部API不使用）。
 * 盤面特徴量（合計高さ・消去ライン・穴・でこぼこ）を重み付けして最良の配置を選ぶ。
 * 重みは Yiyuan Lee の有名な学習済み係数を基にしている。
 */

const W_HEIGHT = -0.510066;
const W_LINES = 0.760666;
const W_HOLES = -0.35663;
const W_BUMP = -0.184483;

export interface Placement {
  rotation: Rotation;
  x: number;
}

export interface PlanOptions {
  /** 1 手先読み（次ピース）を行う。 */
  lookahead?: boolean;
  nextType?: PieceType;
}

/** 盤面の列ごとの高さ（空列は 0）。 */
function columnHeights(board: TetrisBoard): number[] {
  const h: number[] = [];
  for (let x = 0; x < board.width; x++) {
    let top = board.height;
    for (let y = 0; y < board.height; y++) {
      if (board.at(x, y) !== 0) {
        top = y;
        break;
      }
    }
    h.push(board.height - top);
  }
  return h;
}

function countHoles(board: TetrisBoard): number {
  let holes = 0;
  for (let x = 0; x < board.width; x++) {
    let seen = false;
    for (let y = 0; y < board.height; y++) {
      if (board.at(x, y) !== 0) seen = true;
      else if (seen) holes++;
    }
  }
  return holes;
}

function completeLines(board: TetrisBoard): number {
  let n = 0;
  for (let y = 0; y < board.height; y++) {
    let full = true;
    for (let x = 0; x < board.width; x++) {
      if (board.at(x, y) === 0) {
        full = false;
        break;
      }
    }
    if (full) n++;
  }
  return n;
}

/** 盤面（ロック済み・未消去）を評価する。値が大きいほど良い。 */
export function evaluate(board: TetrisBoard): number {
  const heights = columnHeights(board);
  const agg = heights.reduce((a, b) => a + b, 0);
  let bump = 0;
  for (let i = 0; i < heights.length - 1; i++) {
    bump += Math.abs((heights[i] as number) - (heights[i + 1] as number));
  }
  const lines = completeLines(board);
  const holes = countHoles(board);
  return W_HEIGHT * agg + W_LINES * lines + W_HOLES * holes + W_BUMP * bump;
}

/** 指定タイプの全配置を列挙する（回転 × 列、落下後の最終位置）。 */
export function enumeratePlacements(
  board: TetrisBoard,
  type: PieceType,
): Array<{ placement: Placement; piece: ActivePiece }> {
  const out: Array<{ placement: Placement; piece: ActivePiece }> = [];
  const rotations: Rotation[] = type === 'O' ? [0] : [0, 1, 2, 3];
  for (const rotation of rotations) {
    for (let x = -3; x < board.width + 3; x++) {
      let piece: ActivePiece = { type, rotation, x, y: 0 };
      if (board.collides(pieceCells(piece))) continue;
      while (!board.collides(pieceCells({ ...piece, y: piece.y + 1 }))) {
        piece = { ...piece, y: piece.y + 1 };
      }
      out.push({ placement: { rotation, x }, piece });
    }
  }
  return out;
}

/** 最良の配置を返す（候補が無ければ null）。 */
export function bestPlacement(
  board: TetrisBoard,
  type: PieceType,
  opts: PlanOptions = {},
): Placement | null {
  const candidates = enumeratePlacements(board, type);
  let best: Placement | null = null;
  let bestScore = -Infinity;

  for (const { placement, piece } of candidates) {
    const after = board.clone();
    after.place(pieceCells(piece), type);
    let score = evaluate(after);

    if (opts.lookahead && opts.nextType) {
      // ライン消去後に次ピースの最良評価を加味（1 手先読み）。
      const cleared = after.clone();
      cleared.clearLines(cleared.findFullLines());
      const nextCands = enumeratePlacements(cleared, opts.nextType);
      let bestNext = -Infinity;
      for (const nc of nextCands) {
        const nb = cleared.clone();
        nb.place(pieceCells(nc.piece), opts.nextType);
        bestNext = Math.max(bestNext, evaluate(nb));
      }
      if (bestNext > -Infinity) score += 0.6 * bestNext;
    }

    if (score > bestScore) {
      bestScore = score;
      best = placement;
    }
  }
  return best;
}

// ---- プロ思考（ホールド活用・テトリス/全消し意図・先読み）----

/** プロ用ライン消去ボーナス（小消しを抑制し、テトリスと全消しを優先）。 */
const PRO_LINE = [0, -3, -2, -1, 12];
const PRO_PERFECT_CLEAR = 30;

function isEmptyAfterClear(board: TetrisBoard): boolean {
  const c = board.clone();
  c.clearLines(c.findFullLines());
  return c.isEmpty();
}

export interface ThinkOptions {
  lookahead?: boolean;
  usePro?: boolean;
  allowHold?: boolean;
  hold?: PieceType | null;
  next?: PieceType[];
}

export interface MoveDecision {
  useHold: boolean;
  placement: Placement;
}

interface Scored {
  placement: Placement | null;
  score: number;
}

function bestForType(board: TetrisBoard, type: PieceType, opts: ThinkOptions): Scored {
  let best: Placement | null = null;
  let bestScore = -Infinity;
  for (const { placement, piece } of enumeratePlacements(board, type)) {
    const after = board.clone();
    after.place(pieceCells(piece), type);
    let score = evaluate(after);

    if (opts.usePro) {
      const lines = completeLines(after);
      score += PRO_LINE[lines] ?? 12;
      if (lines > 0 && isEmptyAfterClear(after)) score += PRO_PERFECT_CLEAR;
    }

    if (opts.lookahead && opts.next && opts.next.length > 0) {
      const cleared = after.clone();
      cleared.clearLines(cleared.findFullLines());
      const nt = opts.next[0] as PieceType;
      let bestNext = -Infinity;
      for (const nc of enumeratePlacements(cleared, nt)) {
        const nb = cleared.clone();
        nb.place(pieceCells(nc.piece), nt);
        bestNext = Math.max(bestNext, evaluate(nb));
      }
      if (bestNext > -Infinity) score += 0.6 * bestNext;
    }

    if (score > bestScore) {
      bestScore = score;
      best = placement;
    }
  }
  return { placement: best, score: bestScore };
}

// ---- ビーム探索（ホールド込み・複数手先読み：本格的な強さ）----

const LINE_REWARD = [0, 1, 3, 6, 24]; // テトリス(4)を強く優先しつつ消去も許容。
const PC_REWARD = 200;

interface SearchState {
  board: TetrisBoard;
  hold: PieceType | null;
  queue: PieceType[];
  reward: number;
  /** reward + evaluate(board) を一度だけ計算して保持（ソート高速化）。 */
  score: number;
  first: MoveDecision | null;
}

function placeChildren(
  out: SearchState[],
  state: SearchState,
  pieceToPlace: PieceType,
  restQueue: PieceType[],
  newHold: PieceType | null,
  usedHold: boolean,
): void {
  for (const { placement, piece } of enumeratePlacements(state.board, pieceToPlace)) {
    // クローンは 1 回だけ。消去は同じ盤面で行い、余分な確保を避ける。
    const after = state.board.clone();
    after.place(pieceCells(piece), pieceToPlace);
    const lines = completeLines(after);
    if (lines > 0) after.clearLines(after.findFullLines());
    const pc = lines > 0 && after.isEmpty();
    const reward = state.reward + (LINE_REWARD[lines] ?? 24) + (pc ? PC_REWARD : 0);
    out.push({
      board: after,
      hold: newHold,
      queue: restQueue,
      reward,
      score: reward + evaluate(after),
      first: state.first ?? { useHold: usedHold, placement },
    });
  }
}

function children(state: SearchState, allowHold: boolean): SearchState[] {
  const out: SearchState[] = [];
  const q = state.queue;
  if (q.length === 0) return out;
  // A: 先頭をそのまま置く。
  placeChildren(out, state, q[0] as PieceType, q.slice(1), state.hold, false);
  // B: ホールド/入れ替えてから置く。
  if (allowHold) {
    if (state.hold === null) {
      if (q.length >= 2) {
        placeChildren(out, state, q[1] as PieceType, q.slice(2), q[0] as PieceType, true);
      }
    } else {
      placeChildren(out, state, state.hold, q.slice(1), q[0] as PieceType, true);
    }
  }
  return out;
}

/**
 * ビーム探索で最良の初手を決める（本格AI）。
 * current＋next を使い、ホールドも選択肢に含めて depth 手先まで読む。
 */
export function searchBestMove(
  board: TetrisBoard,
  current: PieceType,
  hold: PieceType | null,
  next: PieceType[],
  depth: number,
  beamWidth: number,
  allowHold = true,
): MoveDecision | null {
  const startQueue = [current, ...next];
  let beam: SearchState[] = [
    { board, hold, queue: startQueue, reward: 0, score: evaluate(board), first: null },
  ];
  const plies = Math.max(1, Math.min(depth, startQueue.length));

  let best: SearchState | null = null;
  for (let d = 0; d < plies; d++) {
    const nextStates: SearchState[] = [];
    for (const s of beam) nextStates.push(...children(s, allowHold));
    if (nextStates.length === 0) break;
    // 事前計算した score で並べ替え（評価関数の再計算をしない）。
    nextStates.sort((a, b) => b.score - a.score);
    beam = nextStates.slice(0, beamWidth);
    best = beam[0] ?? best;
  }
  return best?.first ?? null;
}

/**
 * ホールドも含めた最良手を決める（プロ/上級向け）。
 * useHold=true なら一旦ホールドしてから placement を実行する。
 */
export function decideMove(
  board: TetrisBoard,
  current: PieceType,
  opts: ThinkOptions,
): MoveDecision | null {
  const cur = bestForType(board, current, opts);
  let useHold = false;
  let placement = cur.placement;
  let score = cur.score;

  if (opts.allowHold) {
    const altType = opts.hold ?? opts.next?.[0];
    if (altType) {
      const alt = bestForType(board, altType, opts);
      if (alt.placement && alt.score > score + 0.001) {
        useHold = true;
        placement = alt.placement;
        score = alt.score;
      }
    }
  }
  return placement ? { useHold, placement } : null;
}
