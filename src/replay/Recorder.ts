/**
 * リプレイ記録。決定的エンジン（同一シード）＋記録済み操作で完全再生できる。
 * 観戦/リプレイ/将来のサーバ検証の基盤。
 */
export type RecordedAction =
  | 'moveLeft'
  | 'moveRight'
  | 'rotateCW'
  | 'rotateCCW'
  | 'rotate180'
  | 'hold'
  | 'hardDrop'
  | 'softOn'
  | 'softOff';

export interface ReplayEvent {
  /** 開始からの経過時間(ms)。 */
  t: number;
  action: RecordedAction;
}

export interface Replay {
  seed: number;
  /** ルールセット識別子（プリセットID等）。 */
  rules?: string;
  events: ReplayEvent[];
}

export class ReplayRecorder {
  private events: ReplayEvent[] = [];
  private elapsed = 0;

  constructor(
    private readonly seed: number,
    private readonly rules?: string,
  ) {}

  /** ループの dt を加算して内部時計を進める。 */
  advance(dt: number): void {
    this.elapsed += dt;
  }

  /** 現在時刻で操作を記録する。 */
  record(action: RecordedAction): void {
    this.events.push({ t: this.elapsed, action });
  }

  toReplay(): Replay {
    return this.rules !== undefined
      ? { seed: this.seed, rules: this.rules, events: [...this.events] }
      : { seed: this.seed, events: [...this.events] };
  }
}
