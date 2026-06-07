import type { WebSocket } from 'ws';

/**
 * 簡易マッチメイキング。待機キューに1人いれば相手として即マッチ。
 * マッチしたら共通のルームID（自動採番）を返す。
 */
export class Matchmaking {
  private waiting: WebSocket | null = null;
  private counter = 0;

  /** キューに入る。相手が居れば { roomId } を返し、居なければ null（待機）。 */
  enqueue(ws: WebSocket): { roomId: string; opponent: WebSocket } | null {
    if (this.waiting && this.waiting !== ws && this.waiting.readyState === this.waiting.OPEN) {
      const opponent = this.waiting;
      this.waiting = null;
      this.counter++;
      return { roomId: `auto-${this.counter}`, opponent };
    }
    this.waiting = ws;
    return null;
  }

  remove(ws: WebSocket): void {
    if (this.waiting === ws) this.waiting = null;
  }
}
