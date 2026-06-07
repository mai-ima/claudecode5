import type { EngineView } from '../shared/engineView';

/** ティック可能なエンジン（Tetris/Puyo が構造的に満たす）。 */
export interface PlayableEngine extends EngineView {
  start(): void;
  reset(): void;
  tick(dt: number): void;
  togglePause(): void;
  getScore(): number;
}

/** 入力コントローラ共通インターフェイス。 */
export interface InputLike {
  attach(target?: Window | HTMLElement): void;
  detach(): void;
  update(dt: number): void;
}

/**
 * 1 つのゲームセッション。描画は GameApp が views() を使って行う。
 * tick の中身（単独 / ローカル 2P / オンライン）だけがモードごとに異なる。
 */
export interface Session {
  readonly boardCount: number;
  start(): void;
  tick(dt: number): void;
  views(): EngineView[];
  isOver(): boolean;
  resultLines(): string[];
  togglePause(): void;
  dispose(): void;
  /** 盤上に小さく表示する追加情報（タイム/目標など）。任意。 */
  info?(): string[];
}
