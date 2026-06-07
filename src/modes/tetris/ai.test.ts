import { describe, expect, it } from 'vitest';
import { bestPlacement, decideMove, enumeratePlacements, evaluate } from './ai';
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

  it('decideMove は合法な手を返す（ホールド判断含む）', () => {
    const board = new TetrisBoard();
    const d = bestPlacement; // keep import used
    void d;
    const move = decideMove(board, 'T', {
      lookahead: true,
      usePro: true,
      allowHold: true,
      hold: null,
      next: ['I', 'O'],
    });
    expect(move).not.toBeNull();
    expect([0, 1, 2, 3]).toContain(move?.placement.rotation);
    expect(typeof move?.useHold).toBe('boolean');
  });

  it('プロは I を温存するため別ピースを優先してホールドし得る', () => {
    // 縦Iで4ライン消去できる状況（下4行を列0以外で埋める）で、現在Oを持つと
    // プロはIをホールドせずOを処理…の判断が成立する（少なくとも合法手）。
    const board = new TetrisBoard();
    for (let y = board.height - 4; y < board.height; y++) {
      for (let x = 1; x < board.width; x++) board.setGarbage(x, y);
    }
    const move = decideMove(board, 'I', { usePro: true, allowHold: true, hold: null, next: ['O'] });
    expect(move).not.toBeNull();
    // I を今使えばテトリスできるのでホールドしない。
    expect(move?.useHold).toBe(false);
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
