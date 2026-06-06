/**
 * 注入可能なシード付き擬似乱数生成器（mulberry32）。
 *
 * すべてのランダム要素（7-bag, ぷよ生成）にこれを注入することで、
 * 同じシードから完全に決定的な挙動を再現でき、ユニットテストが容易になる。
 */

export interface Rng {
  /** [0, 1) の乱数を返す。 */
  next(): number;
  /** [0, max) の整数を返す。 */
  int(max: number): number;
}

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max: number) => Math.floor(next() * max),
  };
}

/** 実行時用に時刻ベースのシードで RNG を作る。 */
export function createDefaultRng(): Rng {
  return mulberry32((Date.now() ^ (Math.random() * 0x100000000)) >>> 0);
}
