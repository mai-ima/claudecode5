/**
 * 型付きの軽量イベント Emitter。
 *
 * Snapshot（毎フレームの状態）とは別に、ライン消去や連鎖など「一過性の瞬間」を
 * 発火するために使う。AudioManager や描画エフェクト層がこれを購読し、
 * SE / カットインを正しいタイミングで鳴らす。
 */

export type Listener<T> = (payload: T) => void;

export class Emitter<EventMap extends Record<string, unknown>> {
  private listeners: {
    [K in keyof EventMap]?: Set<Listener<EventMap[K]>>;
  } = {};

  on<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): () => void {
    let set = this.listeners[type];
    if (!set) {
      set = new Set();
      this.listeners[type] = set;
    }
    set.add(listener);
    return () => this.off(type, listener);
  }

  off<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): void {
    this.listeners[type]?.delete(listener);
  }

  emit<K extends keyof EventMap>(type: K, payload: EventMap[K]): void {
    const set = this.listeners[type];
    if (!set) return;
    for (const listener of [...set]) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners = {};
  }
}
