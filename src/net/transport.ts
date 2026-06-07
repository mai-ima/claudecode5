import type { JoinResponse, PollResponse, RelayMessage } from './protocol';
import { DEFAULT_API_BASE, POLL_INTERVAL_MS } from './protocol';

/**
 * 通信トランスポートの抽象。ゲームロジックは本インターフェイス経由でのみ通信する。
 * これにより「Vercel サーバーレス(HTTP ポーリング)」と「権威的 WebSocket サーバ」を
 * 1 行で差し替えられる（本家相当バックエンドへの移行準備）。
 */
export interface TransportHandlers {
  onJoined: (player: 0 | 1, room: string) => void;
  onStart: () => void;
  onMessage: (msg: RelayMessage) => void;
  onOpponentLeft: () => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export interface NetTransport {
  connect(room: string, handlers: TransportHandlers): void;
  send(msg: RelayMessage): void;
  close(): void;
}

/** ルーム名から決定的なシードを作る（両者同一 7-bag＝公平）。 */
export function seedFromRoom(room: string): number {
  let h = 2166136261;
  for (let i = 0; i < room.length; i++) {
    h ^= room.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 既定トランスポート：Vercel サーバーレス（/api）への HTTP ポーリング。 */
export class HttpPollingTransport implements NetTransport {
  private room = '';
  private player: 0 | 1 | null = null;
  private started = false;
  private polling = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private handlers: TransportHandlers | null = null;

  constructor(private readonly base: string = DEFAULT_API_BASE) {}

  connect(room: string, handlers: TransportHandlers): void {
    this.room = room;
    this.handlers = handlers;
    void this.join();
  }

  private async join(): Promise<void> {
    try {
      const res = await fetch(`${this.base}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: this.room }),
      });
      if (res.status === 409) {
        this.handlers?.onError('room full');
        return;
      }
      if (!res.ok) {
        this.handlers?.onError(`join failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as JoinResponse;
      this.player = data.player;
      this.handlers?.onJoined(data.player, this.room);
      this.polling = true;
      this.schedulePoll();
    } catch {
      this.handlers?.onError('connection error');
    }
  }

  send(msg: RelayMessage): void {
    if (this.player === null) return;
    void fetch(`${this.base}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ room: this.room, from: this.player, msg }),
    }).catch(() => {
      // 一過性の送信失敗は無視。
    });
  }

  close(): void {
    this.polling = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.handlers?.onClose();
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
          this.handlers?.onStart();
        }
        for (const msg of data.messages) this.handlers?.onMessage(msg);
      }
    } catch {
      // 揺らぎは無視。
    } finally {
      this.schedulePoll();
    }
  }
}

/**
 * 権威的 WebSocket サーバ用トランスポート（移行準備の雛形）。
 * サーバは `join`/中継/`start`/`opponentLeft` を JSON で扱う想定（server/ 雛形と対応）。
 */
export class WebSocketTransport implements NetTransport {
  private ws: WebSocket | null = null;
  private handlers: TransportHandlers | null = null;

  constructor(private readonly url: string) {}

  connect(room: string, handlers: TransportHandlers): void {
    this.handlers = handlers;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.addEventListener('open', () => this.ws?.send(JSON.stringify({ t: 'join', room })));
      this.ws.addEventListener('message', (ev) => this.onData(String(ev.data)));
      this.ws.addEventListener('close', () => handlers.onClose());
      this.ws.addEventListener('error', () => handlers.onError('connection error'));
    } catch {
      handlers.onError('connection error');
    }
  }

  private onData(data: string): void {
    let msg: { t?: string; player?: number; room?: string };
    try {
      msg = JSON.parse(data) as { t?: string; player?: number; room?: string };
    } catch {
      return;
    }
    switch (msg.t) {
      case 'joined':
        this.handlers?.onJoined((msg.player === 1 ? 1 : 0) as 0 | 1, msg.room ?? '');
        break;
      case 'start':
        this.handlers?.onStart();
        break;
      case 'opponentLeft':
        this.handlers?.onOpponentLeft();
        break;
      case 'snapshot':
      case 'attack':
      case 'gameover':
        this.handlers?.onMessage(msg as unknown as RelayMessage);
        break;
    }
  }

  send(msg: RelayMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
