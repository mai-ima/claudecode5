import type { Rng } from '../../shared/rng';
import { PIECE_TYPES } from './types';
import type { PieceType } from './types';

/**
 * 7-bag ランダマイザ。7 種が必ず 1 巡してから次の巡に入る。
 * RNG を注入することで決定的にテスト可能。
 */
export class SevenBag {
  private queue: PieceType[] = [];

  constructor(private readonly rng: Rng) {}

  /** 次のピース種を取り出す（必要なら袋を補充）。 */
  next(): PieceType {
    if (this.queue.length === 0) {
      this.refill();
    }
    return this.queue.shift() as PieceType;
  }

  /** プレビュー用に先頭 n 個を覗き見る。 */
  peek(n: number): PieceType[] {
    while (this.queue.length < n) {
      this.refill();
    }
    return this.queue.slice(0, n);
  }

  private refill(): void {
    const bag = [...PIECE_TYPES];
    // Fisher-Yates シャッフル。
    for (let i = bag.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      const a = bag[i] as PieceType;
      const b = bag[j] as PieceType;
      bag[i] = b;
      bag[j] = a;
    }
    this.queue.push(...bag);
  }
}
