/// <reference lib="webworker" />
import { decideMove, searchBestMove } from '../../modes/tetris/ai';
import { TetrisBoard } from '../../modes/tetris/TetrisBoard';
import type { PieceType } from '../../modes/tetris/types';

/**
 * AI 探索を別スレッドで実行するワーカ（メインスレッドのカクつきを根絶）。
 * 純粋な探索ロジック（ai.ts）のみを使う。
 */
interface AiRequest {
  id: number;
  cells: ArrayBuffer;
  current: PieceType;
  hold: PieceType | null;
  next: PieceType[];
  depth: number;
  beam: number;
  allowHold: boolean;
}

self.onmessage = (e: MessageEvent<AiRequest>): void => {
  const { id, cells, current, hold, next, depth, beam, allowHold } = e.data;
  const board = new TetrisBoard(new Uint8Array(cells));
  const move =
    depth > 0
      ? searchBestMove(board, current, hold, next, depth, beam, allowHold)
      : decideMove(board, current, { allowHold, hold, next });
  (self as DedicatedWorkerGlobalScope).postMessage({ id, move });
};
