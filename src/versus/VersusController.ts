import type { EngineView } from '../shared/engineView';

/**
 * 対戦の 1 席（プレイヤー）。
 * - view: 描画用スナップショットを提供（本物エンジン or DummyEngine）。
 * - queueGarbage: 相手から送られたおじゃまを受け取る。
 * - onAttack: 自分が攻撃を放ったときに呼ばれるコールバックを登録。
 */
export interface Combatant {
  view: EngineView;
  queueGarbage(amount: number): void;
  onAttack(cb: (amount: number) => void): void;
}

/**
 * 2 つの席を管理し、攻撃を相互ルーティングして決着を判定する。
 * ローカル 2P でもオンラインでも同じ構造（席に何を刺すかだけが違う）。
 */
export class VersusController {
  private winner: 0 | 1 | null = null;

  constructor(
    private readonly p0: Combatant,
    private readonly p1: Combatant,
  ) {
    this.p0.onAttack((amount) => this.p1.queueGarbage(amount));
    this.p1.onAttack((amount) => this.p0.queueGarbage(amount));
  }

  get slots(): [EngineView, EngineView] {
    return [this.p0.view, this.p1.view];
  }

  /** 決着していれば勝者のインデックスを返す。 */
  update(): 0 | 1 | null {
    if (this.winner !== null) return this.winner;
    const dead0 = this.p0.view.isGameOver();
    const dead1 = this.p1.view.isGameOver();
    if (dead0 && !dead1) this.winner = 1;
    else if (dead1 && !dead0) this.winner = 0;
    else if (dead0 && dead1) this.winner = 0;
    return this.winner;
  }

  getWinner(): 0 | 1 | null {
    return this.winner;
  }
}
