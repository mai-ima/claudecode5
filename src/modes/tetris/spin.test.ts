import { describe, expect, it } from 'vitest';
import { TetrisBoard } from './TetrisBoard';
import { pieceCells } from './piece';
import { detectSpin, isImmobile } from './spin';
import type { ActivePiece } from './types';

function immobileBoard(piece: ActivePiece): TetrisBoard {
  const board = new TetrisBoard();
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) board.setGarbage(x, y);
  }
  for (const c of pieceCells(piece)) board.clear(c.x, c.y);
  return board;
}

const piece: ActivePiece = { type: 'T', rotation: 0, x: 4, y: 20 };

describe('スピン判定（all-spin / immobile）', () => {
  it('周囲を埋めると immobile になる', () => {
    expect(isImmobile(immobileBoard(piece), piece)).toBe(true);
    expect(isImmobile(new TetrisBoard(), piece)).toBe(false);
  });

  it('allspin: 回転で着地し immobile なら full', () => {
    const board = immobileBoard(piece);
    expect(detectSpin(board, piece, 'allspin', true, null)).toBe('full');
    // 直前が回転でなければ none。
    expect(detectSpin(board, piece, 'allspin', false, null)).toBe('none');
  });

  it('none モードでは常に none', () => {
    const board = immobileBoard(piece);
    expect(detectSpin(board, piece, 'none', true, null)).toBe('none');
  });

  it('空きスペース（可動）では spin にならない', () => {
    expect(detectSpin(new TetrisBoard(), piece, 'allspin', true, null)).toBe('none');
  });
});
