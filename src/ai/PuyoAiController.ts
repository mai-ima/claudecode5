import type { InputLike } from '../app/Session';
import { bestPuyoPlacement } from '../modes/puyo/ai';
import type { PuyoPlacement } from '../modes/puyo/ai';
import type { PuyoEngine } from '../modes/puyo/PuyoEngine';
import type { AiLevel } from './AiController';

const MOVE_INTERVAL: Record<AiLevel, number> = {
  easy: 220,
  normal: 90,
  hard: 45,
};

/** ぷよ用の内蔵AI操作器（InputLike）。 */
export class PuyoAiController implements InputLike {
  private plan: PuyoPlacement | null = null;
  private moveAcc = 0;
  private off: (() => void) | null = null;

  constructor(
    private readonly engine: PuyoEngine,
    private level: AiLevel = 'normal',
  ) {}

  setLevel(level: AiLevel): void {
    this.level = level;
  }

  attach(): void {
    this.off = this.engine.events.on('spawn', () => {
      this.plan = null;
    });
  }

  detach(): void {
    this.off?.();
    this.off = null;
  }

  update(dt: number): void {
    const active = this.engine.getActive();
    if (!active) return;
    if (this.plan === null) this.plan = bestPuyoPlacement(this.engine.getBoard(), active);
    if (!this.plan) return;

    this.moveAcc += dt;
    if (this.moveAcc < MOVE_INTERVAL[this.level]) return;
    this.moveAcc = 0;

    if (active.orientation !== this.plan.orientation) {
      this.engine.rotateCW();
      return;
    }
    if (active.x < this.plan.x) this.engine.moveRight();
    else if (active.x > this.plan.x) this.engine.moveLeft();
    else this.engine.hardDrop();
  }
}
