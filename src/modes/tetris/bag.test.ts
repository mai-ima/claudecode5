import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { SevenBag } from './bag';
import { PIECE_TYPES } from './types';

describe('SevenBag', () => {
  it('連続する 7 個に 7 種が必ず 1 回ずつ現れる', () => {
    const bag = new SevenBag(mulberry32(1));
    for (let round = 0; round < 5; round++) {
      const seven = Array.from({ length: 7 }, () => bag.next());
      expect([...seven].sort()).toEqual([...PIECE_TYPES].sort());
    }
  });

  it('peek は次に出る順序と一致する', () => {
    const bag = new SevenBag(mulberry32(42));
    const peeked = bag.peek(5);
    const taken = Array.from({ length: 5 }, () => bag.next());
    expect(taken).toEqual(peeked);
  });

  it('同じシードは同じ順序を生成する（決定的）', () => {
    const a = new SevenBag(mulberry32(7));
    const b = new SevenBag(mulberry32(7));
    const seqA = Array.from({ length: 14 }, () => a.next());
    const seqB = Array.from({ length: 14 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
});
