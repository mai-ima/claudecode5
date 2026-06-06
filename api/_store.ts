/**
 * オンライン対戦のルーム状態ストア（Vercel サーバーレス用）。
 *
 * サーバーレスはステートレスなため、ルーム状態とメッセージキューは KV（Vercel KV /
 * Upstash Redis）に持つ。KV の環境変数が無いローカル単一プロセス時のみ、メモリ実装に
 * フォールバックする（本番では KV 必須。複数インスタンス間で共有するため）。
 */

const ROOM_TTL_SECONDS = 60 * 30;

export interface RoomStore {
  /** ルームに参加。割り当てプレイヤー番号（満室なら null）。 */
  join(room: string): Promise<0 | 1 | null>;
  /** 2 人そろって対戦開始可能か。 */
  isStarted(room: string): Promise<boolean>;
  /** 相手のメールボックスへ JSON メッセージを積む。 */
  push(room: string, toPlayer: 0 | 1, msgJson: string): Promise<void>;
  /** 自分宛メッセージを取り出して空にする。 */
  drain(room: string, player: 0 | 1): Promise<string[]>;
}

const countKey = (room: string): string => `tetris:room:${room}:count`;
const boxKey = (room: string, player: number): string => `tetris:room:${room}:box:${player}`;

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** Vercel KV 実装。 */
class KvStore implements RoomStore {
  async join(room: string): Promise<0 | 1 | null> {
    const { kv } = await import('@vercel/kv');
    const count = await kv.incr(countKey(room));
    await kv.expire(countKey(room), ROOM_TTL_SECONDS);
    if (count > 2) return null;
    return (count - 1) as 0 | 1;
  }

  async isStarted(room: string): Promise<boolean> {
    const { kv } = await import('@vercel/kv');
    const count = (await kv.get<number>(countKey(room))) ?? 0;
    return count >= 2;
  }

  async push(room: string, toPlayer: 0 | 1, msgJson: string): Promise<void> {
    const { kv } = await import('@vercel/kv');
    const key = boxKey(room, toPlayer);
    await kv.rpush(key, msgJson);
    await kv.expire(key, ROOM_TTL_SECONDS);
  }

  async drain(room: string, player: 0 | 1): Promise<string[]> {
    const { kv } = await import('@vercel/kv');
    const key = boxKey(room, player);
    const items = await kv.lpop<string[]>(key, 100);
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
  }
}

/** ローカル単一プロセス用のメモリ実装（本番では使われない）。 */
class MemoryStore implements RoomStore {
  private counts = new Map<string, number>();
  private boxes = new Map<string, string[]>();

  join(room: string): Promise<0 | 1 | null> {
    const count = (this.counts.get(room) ?? 0) + 1;
    this.counts.set(room, count);
    if (count > 2) return Promise.resolve(null);
    return Promise.resolve((count - 1) as 0 | 1);
  }

  isStarted(room: string): Promise<boolean> {
    return Promise.resolve((this.counts.get(room) ?? 0) >= 2);
  }

  push(room: string, toPlayer: 0 | 1, msgJson: string): Promise<void> {
    const key = boxKey(room, toPlayer);
    const arr = this.boxes.get(key) ?? [];
    arr.push(msgJson);
    this.boxes.set(key, arr);
    return Promise.resolve();
  }

  drain(room: string, player: 0 | 1): Promise<string[]> {
    const key = boxKey(room, player);
    const arr = this.boxes.get(key) ?? [];
    this.boxes.set(key, []);
    return Promise.resolve(arr);
  }
}

let store: RoomStore | null = null;

export function getStore(): RoomStore {
  if (!store) store = hasKv() ? new KvStore() : new MemoryStore();
  return store;
}
