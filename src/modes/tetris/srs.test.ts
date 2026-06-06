import { describe, expect, it } from 'vitest';
import { TetrisBoard } from './TetrisBoard';
import { pieceCells } from './piece';
import { tryRotate } from './srs';
import { shapeCells } from './tetromino';
import { PIECE_TYPES } from './types';
import type { ActivePiece, Rotation } from './types';

describe('SRS tryRotate', () => {
  it('空きスペースでは全ピースの全回転がキック index 0 で成功する', () => {
    const board = new TetrisBoard();
    for (const type of PIECE_TYPES) {
      const piece: ActivePiece = { type, rotation: 0, x: 4, y: 10 };
      for (const to of [1, 2, 3] as Rotation[]) {
        const outcome = tryRotate(board, piece, to);
        expect(outcome, `${type} 0->${to}`).not.toBeNull();
        expect(outcome?.kick.index).toBe(0);
      }
    }
  });

  it('O は回転しても形が変わらない', () => {
    const board = new TetrisBoard();
    const piece: ActivePiece = { type: 'O', rotation: 0, x: 4, y: 10 };
    const outcome = tryRotate(board, piece, 1);
    expect(outcome).not.toBeNull();
    expect(pieceCells(outcome!.piece)).toEqual(pieceCells(piece));
  });

  it('全候補が衝突する場合は null を返す', () => {
    const board = new TetrisBoard();
    const piece: ActivePiece = { type: 'T', rotation: 0, x: 4, y: 20 };
    // 盤面全体を埋めてから、現在のピースセルだけ空ける。
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) board.setGarbage(x, y);
    }
    for (const cell of pieceCells(piece)) {
      // 現在位置は衝突しない状態にする（強制的に空ける）。
      board.clear(cell.x, cell.y);
    }
    expect(board.collides(pieceCells(piece))).toBe(false);
    expect(tryRotate(board, piece, 1)).toBeNull();
  });

  it('回転状態ごとに 4 セルを持つ', () => {
    for (const type of PIECE_TYPES) {
      for (const rot of [0, 1, 2, 3] as Rotation[]) {
        expect(shapeCells(type, rot)).toHaveLength(4);
      }
    }
  });
});
