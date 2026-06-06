import { describe, expect, it } from 'vitest';
import { TetrisBoard } from './TetrisBoard';
import { detectTSpin } from './tspin';
import type { ActivePiece } from './types';

const tPiece: ActivePiece = { type: 'T', rotation: 0, x: 4, y: 20 };
// rotation 0 のコーナー絶対座標: (4,20)(6,20)(4,22)(6,22)。前方は上 2 つ。

describe('detectTSpin', () => {
  it('3 隅以上 + 前方 2 隅で full', () => {
    const board = new TetrisBoard();
    board.setGarbage(4, 20); // front
    board.setGarbage(6, 20); // front
    board.setGarbage(4, 22); // back
    expect(detectTSpin(board, tPiece, true, { index: 0, dx: 0, dy: 0 })).toBe('full');
  });

  it('3 隅だが前方 1 隅だけなら mini', () => {
    const board = new TetrisBoard();
    board.setGarbage(4, 20); // front (1 つだけ)
    board.setGarbage(4, 22); // back
    board.setGarbage(6, 22); // back
    expect(detectTSpin(board, tPiece, true, { index: 0, dx: 0, dy: 0 })).toBe('mini');
  });

  it('最終キック(index 4)で入った mini は full に昇格', () => {
    const board = new TetrisBoard();
    board.setGarbage(4, 20);
    board.setGarbage(4, 22);
    board.setGarbage(6, 22);
    expect(detectTSpin(board, tPiece, true, { index: 4, dx: 1, dy: 2 })).toBe('full');
  });

  it('直前が回転でなければ none', () => {
    const board = new TetrisBoard();
    board.setGarbage(4, 20);
    board.setGarbage(6, 20);
    board.setGarbage(4, 22);
    expect(detectTSpin(board, tPiece, false, null)).toBe('none');
  });

  it('隅が 2 つ以下なら none', () => {
    const board = new TetrisBoard();
    board.setGarbage(4, 20);
    board.setGarbage(6, 20);
    expect(detectTSpin(board, tPiece, true, { index: 0, dx: 0, dy: 0 })).toBe('none');
  });

  it('T 以外は none', () => {
    const board = new TetrisBoard();
    board.setGarbage(4, 20);
    board.setGarbage(6, 20);
    board.setGarbage(4, 22);
    const j: ActivePiece = { type: 'J', rotation: 0, x: 4, y: 20 };
    expect(detectTSpin(board, j, true, { index: 0, dx: 0, dy: 0 })).toBe('none');
  });
});
