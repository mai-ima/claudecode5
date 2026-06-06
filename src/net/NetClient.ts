import type { Snapshot } from '../shared/snapshot';
import type { ClientToServer, ServerToClient } from './protocol';
import { DEFAULT_WS_URL } from './protocol';

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
 * WebSocket クライアント。結果（おじゃま）と相手 Snapshot の交換のみを担う。
 */
export class NetClient {
  private ws: WebSocket | null = null;

  constructor(private readonly callbacks: NetCallbacks = {}) {}

  connect(room: string, url: string = DEFAULT_WS_URL): void {
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => this.send({ t: 'join', room }));
    this.ws.addEventListener('message', (ev) => this.handle(ev.data as string));
    this.ws.addEventListener('close', () => this.callbacks.onClose?.());
    this.ws.addEventListener('error', () => this.callbacks.onError?.('connection error'));
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  sendSnapshot(snapshot: Snapshot): void {
    this.send({ t: 'snapshot', snapshot });
  }

  sendAttack(amount: number): void {
    if (amount > 0) this.send({ t: 'attack', amount });
  }

  sendGameOver(): void {
    this.send({ t: 'gameover' });
  }

  private send(msg: ClientToServer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handle(data: string): void {
    let msg: ServerToClient;
    try {
      msg = JSON.parse(data) as ServerToClient;
    } catch {
      return;
    }
    switch (msg.t) {
      case 'joined':
        this.callbacks.onJoined?.(msg.player, msg.room);
        break;
      case 'start':
        this.callbacks.onStart?.();
        break;
      case 'snapshot':
        this.callbacks.onSnapshot?.(msg.snapshot);
        break;
      case 'attack':
        this.callbacks.onAttack?.(msg.amount);
        break;
      case 'gameover':
        this.callbacks.onOpponentGameOver?.();
        break;
      case 'opponentLeft':
        this.callbacks.onOpponentLeft?.();
        break;
    }
  }
}
