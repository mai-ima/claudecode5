import { describe, expect, it } from 'vitest';
import { bestPlacement, enumeratePlacements, evaluate } from './ai';
import { pieceCells } from './piece';
import { TetrisBoard } from './TetrisBoard';
import { PIECE_TYPES } from './types';

function applyPlacement(board: TetrisBoard, type: Parameters<typeof bestPlacement>[1], placement: { rotation: number; x: number }): TetrisBoard {
  const match = enumeratePlacements(board, type).find(
    (c) => c.placement.rotation === placement.rotation && c.placement.x === placement.x,
  );
  const next = board.clone();
  if (match) next.place(pieceCells(match.piece), type);
  return next;
}

describe('Tetris AI', () => {
  it('空盤面で全ピースの合法手を返す', () => {
    const board = new TetrisBoard();
    for (const type of PIECE_TYPES) {
      const p = bestPlacement(board, type);
      expect(p, type).not.toBeNull();
      expect([0, 1, 2, 3]).toContain(p?.rotation);
    }
  });

  it('テトリス（4ライン消去）が可能ならそれを選ぶ', () => {
    const board = new TetrisBoard();
    // 下 4 行を「列0以外」埋める → 縦Iで4ライン消去できる。
    for (let y = board.height - 4; y < board.height; y++) {
      for (let x = 1; x < board.width; x++) board.setGarbage(x, y);
    }
    const placement = bestPlacement(board, 'I');
    expect(placement).not.toBeNull();
    const after = applyPlacement(board, 'I', placement!);
    expect(after.findFullLines().length).toBe(4);
  });

  it('穴を作る手より作らない手を高く評価する', () => {
    const flat = new TetrisBoard();
    for (let x = 0; x < flat.width; x++) flat.setGarbage(x, flat.height - 1);
    const withHole = flat.clone();
    // 浮いたブロック（下に穴）を作る。
    withHole.setGarbage(3, flat.height - 3);
    expect(evaluate(flat)).toBeGreaterThan(evaluate(withHole));
  });
});
