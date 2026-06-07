import { describe, expect, it } from 'vitest';
import { PUYO_TOTAL_HEIGHT, PuyoBoard } from './PuyoBoard';
import { findClearGroups, garbageFromScore, resolveChains } from './chain';

const BOTTOM = PUYO_TOTAL_HEIGHT - 1;

describe('PuyoBoard.applyGravity', () => {
  it('浮いているぷよが底へ落ちる', () => {
    const board = new PuyoBoard();
    board.setColor(0, 0, 'red');
    expect(board.applyGravity()).toBe(true);
    expect(board.idAt(0, BOTTOM)).toBe('red');
    expect(board.idAt(0, 0)).toBeNull();
  });
});

describe('findClearGroups', () => {
  it('4 連結未満は検出しない', () => {
    const board = new PuyoBoard();
    board.setColor(0, BOTTOM, 'red');
    board.setColor(1, BOTTOM, 'red');
    board.setColor(2, BOTTOM, 'red');
    expect(findClearGroups(board)).toHaveLength(0);
  });

  it('4 連結を検出する', () => {
    const board = new PuyoBoard();
    for (let x = 0; x < 4; x++) board.setColor(x, BOTTOM, 'red');
    expect(findClearGroups(board)).toHaveLength(1);
  });
});

describe('resolveChains', () => {
  it('横一列 4 個で 1 連鎖', () => {
    const board = new PuyoBoard();
    for (let x = 0; x < 4; x++) board.setColor(x, BOTTOM, 'red');
    const result = resolveChains(board);
    expect(result.chains).toBe(1);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(board.idAt(0, BOTTOM)).toBeNull();
  });

  it('2 連鎖が成立する', () => {
    const board = new PuyoBoard();
    // 赤 2x2（即消去）。
    board.setColor(0, BOTTOM, 'red');
    board.setColor(0, BOTTOM - 1, 'red');
    board.setColor(1, BOTTOM, 'red');
    board.setColor(1, BOTTOM - 1, 'red');
    // 青（赤消去後に落ちて 4 連結）。
    board.setColor(0, BOTTOM - 2, 'blue');
    board.setColor(0, BOTTOM - 3, 'blue');
    board.setColor(1, BOTTOM - 2, 'blue');
    board.setColor(2, BOTTOM, 'blue');
    const result = resolveChains(board);
    expect(result.chains).toBe(2);
  });

  it('隣接するおじゃまも消える', () => {
    const board = new PuyoBoard();
    for (let x = 0; x < 4; x++) board.setColor(x, BOTTOM, 'green');
    board.setGarbage(0, BOTTOM - 1); // 緑グループに隣接
    resolveChains(board);
    expect(board.idAt(0, BOTTOM)).toBeNull();
  });

  it('連鎖が大きいほど高得点', () => {
    const small = new PuyoBoard();
    for (let x = 0; x < 4; x++) small.setColor(x, BOTTOM, 'red');
    const smallScore = resolveChains(small).totalScore;

    const big = new PuyoBoard();
    for (let x = 0; x < 4; x++) big.setColor(x, BOTTOM, 'red');
    big.setColor(0, BOTTOM - 1, 'blue');
    big.setColor(0, BOTTOM - 2, 'blue');
    big.setColor(1, BOTTOM - 1, 'blue');
    big.setColor(2, BOTTOM - 1, 'blue');
    const bigScore = resolveChains(big).totalScore;
    expect(bigScore).toBeGreaterThan(smallScore);
  });
});

describe('全消し（zenkeshi）', () => {
  it('盤面の全ぷよが消えると isEmpty になる', () => {
    const board = new PuyoBoard();
    for (let x = 0; x < 4; x++) board.setColor(x, BOTTOM, 'red');
    resolveChains(board);
    expect(board.isAllEmpty()).toBe(true);
  });
});

describe('garbageFromScore', () => {
  it('スコアに応じておじゃま数を返す', () => {
    expect(garbageFromScore(140, 70)).toBe(2);
    expect(garbageFromScore(60, 70)).toBe(0);
  });
});
