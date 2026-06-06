import { describe, expect, it } from 'vitest';
import { computeLockScore } from './scoring';

const ctx = (over = {}) => ({ level: 1, combo: 0, backToBack: false, ...over });

describe('computeLockScore', () => {
  it('シングル/ダブル/トリプル/テトリスの基本点', () => {
    expect(computeLockScore({ linesCleared: 1, tspin: 'none' }, ctx()).points).toBe(100);
    expect(computeLockScore({ linesCleared: 2, tspin: 'none' }, ctx()).points).toBe(300);
    expect(computeLockScore({ linesCleared: 3, tspin: 'none' }, ctx()).points).toBe(500);
    const tetris = computeLockScore({ linesCleared: 4, tspin: 'none' }, ctx());
    expect(tetris.points).toBe(800);
    expect(tetris.isDifficult).toBe(true);
    expect(tetris.label).toBe('Tetris');
  });

  it('レベルに比例する', () => {
    expect(computeLockScore({ linesCleared: 1, tspin: 'none' }, ctx({ level: 3 })).points).toBe(300);
  });

  it('T-Spin の加点とラベル', () => {
    const r = computeLockScore({ linesCleared: 2, tspin: 'full' }, ctx());
    expect(r.points).toBe(1200);
    expect(r.isDifficult).toBe(true);
    expect(r.label).toBe('T-Spin Double');
  });

  it('T-Spin Mini', () => {
    const r = computeLockScore({ linesCleared: 1, tspin: 'mini' }, ctx());
    expect(r.points).toBe(200);
    expect(r.label).toBe('T-Spin Mini Single');
  });

  it('Back-to-Back で 1.5 倍', () => {
    const r = computeLockScore({ linesCleared: 4, tspin: 'none' }, ctx({ backToBack: true }));
    expect(r.points).toBe(Math.floor(800 * 1.5));
  });

  it('Combo 加点', () => {
    const r = computeLockScore({ linesCleared: 1, tspin: 'none' }, ctx({ combo: 2 }));
    // 100 + 50*2*1
    expect(r.points).toBe(200);
  });

  it('消去なしは 0 点', () => {
    expect(computeLockScore({ linesCleared: 0, tspin: 'none' }, ctx()).points).toBe(0);
  });
});
