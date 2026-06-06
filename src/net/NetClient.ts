import type { Snapshot } from '../shared/snapshot';
import type { JoinResponse, PollResponse, RelayMessage } from './protocol';
import { DEFAULT_API_BASE, POLL_INTERVAL_MS } from './protocol';

export interface NetCallbacks {
  onJoined?: (player: 0 | 1, room: string) => void;
  onStart?: () => void;
  onSnapshot?: (snapshot: Snapshot) => void;
  onAttack?: (amount: number) => void;
  onOpponentGameOver?: () => void;
  onOpponentLeft?: () => void;
  onClose?: () => void;
  onError?: (message: string) => void;
}

/**
 * オンライン対戦クライアント（Vercel サーバーレス / HTTP ポーリング）。
 *
 * 常駐 WebSocket は使わず、join → 定期 poll → send で結果と相手 Snapshot を交換する。
 * Vercel のサーバーレス + KV と組み合わせて動作する。
 */
export class NetClient {
  private room = '';
  private player: 0 | 1 | null = null;
  private started = false;
  private polling = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly callbacks: NetCallbacks = {},
    private readonly base: string = DEFAULT_API_BASE,
  ) {}

  async connect(room: string): Promise<void> {
    this.room = room;
    try {
      const res = await fetch(`${this.base}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room }),
      });
      if (res.status === 409) {
        this.callbacks.onError?.('room full');
        return;
      }
      if (!res.ok) {
        this.callbacks.onError?.(`join failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as JoinResponse;
      this.player = data.player;
      this.callbacks.onJoined?.(data.player, room);
      this.polling = true;
      this.schedulePoll();
    } catch {
      this.callbacks.onError?.('connection error');
    }
  }

  disconnect(): void {
    this.polling = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.callbacks.onClose?.();
  }

  sendSnapshot(snapshot: Snapshot): void {
    void this.send({ t: 'snapshot', snapshot });
  }

  sendAttack(amount: number): void {
    if (amount > 0) void this.send({ t: 'attack', amount });
  }

  sendGameOver(): void {
    void this.send({ t: 'gameover' });
  }

  private async send(msg: RelayMessage): Promise<void> {
    if (this.player === null) return;
    try {
      await fetch(`${this.base}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: this.room, from: this.player, msg }),
      });
    } catch {
      // 一過性の送信失敗は無視（次のフレームで再送される）。
    }
  }

  private schedulePoll(): void {
    if (!this.polling) return;
    this.timer = setTimeout(() => void this.poll(), POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    if (!this.polling || this.player === null) return;
    try {
      const url = `${this.base}/poll?room=${encodeURIComponent(this.room)}&player=${this.player}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as PollResponse;
        if (data.started && !this.started) {
          this.started = true;
          this.callbacks.onStart?.();
        }
        for (const msg of data.messages) this.dispatch(msg);
      }
    } catch {
      // ネットワーク揺らぎは無視して次回ポーリング。
    } finally {
      this.schedulePoll();
    }
  }

  private dispatch(msg: RelayMessage): void {
    switch (msg.t) {
      case 'snapshot':
        this.callbacks.onSnapshot?.(msg.snapshot);
        break;
      case 'attack':
        this.callbacks.onAttack?.(msg.amount);
        break;
      case 'gameover':
        this.callbacks.onOpponentGameOver?.();
        break;
    }
  }
}
