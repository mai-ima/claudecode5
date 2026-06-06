import { describe, expect, it } from 'vitest';
import { ccw, cw, flip, movedPiece, pieceCells, spawnPiece } from './piece';
import type { ActivePiece } from './types';

describe('piece', () => {
  it('spawnPiece は回転 0 で生成される', () => {
    const p = spawnPiece('T');
    expect(p.type).toBe('T');
    expect(p.rotation).toBe(0);
  });

  it('pieceCells は原点を加算した絶対座標を返す', () => {
    const p: ActivePiece = { type: 'O', rotation: 0, x: 4, y: 0 };
    const cells = pieceCells(p);
    expect(cells).toHaveLength(4);
    // O は (1,0)(2,0)(1,1)(2,1) → x+4
    expect(cells).toContainEqual({ x: 5, y: 0 });
    expect(cells).toContainEqual({ x: 6, y: 1 });
  });

  it('movedPiece は新しいオブジェクトを返す（不変）', () => {
    const p = spawnPiece('L');
    const moved = movedPiece(p, 1, 2);
    expect(moved).not.toBe(p);
    expect(moved.x).toBe(p.x + 1);
    expect(moved.y).toBe(p.y + 2);
    expect(p.x).toBe(spawnPiece('L').x);
  });

  it('回転ヘルパは循環する', () => {
    expect(cw(0)).toBe(1);
    expect(cw(3)).toBe(0);
    expect(ccw(0)).toBe(3);
    expect(flip(0)).toBe(2);
    expect(flip(3)).toBe(1);
  });
});
