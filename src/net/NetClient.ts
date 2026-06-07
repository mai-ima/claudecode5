import type { Snapshot } from '../shared/snapshot';
import type { RelayMessage } from './protocol';
import { HttpPollingTransport, seedFromRoom } from './transport';
import type { NetTransport } from './transport';

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
 * オンライン対戦クライアント。トランスポート（既定 = Vercel HTTP ポーリング）越しに
 * 結果（おじゃま）と相手 Snapshot を交換する。トランスポート差し替えで権威的 WS へ移行可。
 *
 * ルーム名から決定的シードを導出し、両者同一の 7-bag で公平に対戦する。
 */
export class NetClient {
  private seed = 0;

  constructor(
    private readonly callbacks: NetCallbacks = {},
    private readonly transport: NetTransport = new HttpPollingTransport(),
  ) {}

  /** ルーム名から導出された共有シード（接続後に有効）。 */
  getSeed(): number {
    return this.seed;
  }

  connect(room: string): void {
    this.seed = seedFromRoom(room);
    this.transport.connect(room, {
      onJoined: (p, r) => this.callbacks.onJoined?.(p, r),
      onStart: () => this.callbacks.onStart?.(),
      onOpponentLeft: () => this.callbacks.onOpponentLeft?.(),
      onClose: () => this.callbacks.onClose?.(),
      onError: (m) => this.callbacks.onError?.(m),
      onMessage: (msg) => this.dispatch(msg),
    });
  }

  disconnect(): void {
    this.transport.close();
  }

  sendSnapshot(snapshot: Snapshot): void {
    this.transport.send({ t: 'snapshot', snapshot });
  }

  sendAttack(amount: number): void {
    if (amount > 0) this.transport.send({ t: 'attack', amount });
  }

  sendGameOver(): void {
    this.transport.send({ t: 'gameover' });
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
