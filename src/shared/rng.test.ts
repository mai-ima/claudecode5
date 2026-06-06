import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';

describe('mulberry32', () => {
  it('同じシードは同じ列を生成する', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('異なるシードは異なる列を生成する', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it('int(max) は [0, max) の整数を返す', () => {
    const r = mulberry32(99);
    for (let i = 0; i < 100; i++) {
      const v = r.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
