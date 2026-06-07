import type { InputLike } from '../app/Session';
import { decideMove, enumeratePlacements } from '../modes/tetris/ai';
import type { MoveDecision } from '../modes/tetris/ai';
import type { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { PieceType } from '../modes/tetris/types';

export type AiLevel = 'easy' | 'normal' | 'hard' | 'pro';

interface LevelCfg {
  interval: number;
  randomness: number;
  lookahead: boolean;
  allowHold: boolean;
  usePro: boolean;
}

const LEVELS: Record<AiLevel, LevelCfg> = {
  easy: { interval: 200, randomness: 0.3, lookahead: false, allowHold: false, usePro: false },
  normal: { interval: 80, randomness: 0.05, lookahead: false, allowHold: false, usePro: false },
  hard: { interval: 36, randomness: 0, lookahead: true, allowHold: true, usePro: false },
  pro: { interval: 16, randomness: 0, lookahead: true, allowHold: true, usePro: true },
};

/**
 * テトリス用の内蔵AI操作器（InputLike）。難易度で思考の深さ・速さ・
 * ホールド活用・テトリス/全消し意図が変わる。
 */
export class TetrisAiController implements InputLike {
  private plan: MoveDecision | null = null;
  private moveAcc = 0;
  private stuck = 0;
  private prevX = Number.NaN;
  private didHold = false;
  private off: (() => void) | null = null;

  constructor(
    private readonly engine: TetrisEngine,
    private level: AiLevel = 'normal',
  ) {}

  setLevel(level: AiLevel): void {
    this.level = level;
  }

  attach(): void {
    this.off = this.engine.events.on('spawn', () => {
      this.plan = null;
      this.didHold = false;
      this.stuck = 0;
      this.prevX = Number.NaN;
    });
  }

  detach(): void {
    this.off?.();
    this.off = null;
  }

  update(dt: number): void {
    const active = this.engine.getActive();
    if (!active) return;

    if (this.plan === null) this.plan = this.think(active.type);
    if (!this.plan) return;

    this.moveAcc += dt;
    if (this.moveAcc < LEVELS[this.level].interval) return;
    this.moveAcc = 0;

    // ホールドを使う手なら、まず一度だけホールドして再計画。
    if (this.plan.useHold && !this.didHold) {
      this.engine.hold();
      this.didHold = true;
      this.plan = null;
      return;
    }

    const target = this.plan.placement;
    if (active.rotation !== target.rotation) {
      this.engine.rotateCW();
      return;
    }
    if (active.x < target.x) {
      this.engine.moveRight();
    } else if (active.x > target.x) {
      this.engine.moveLeft();
    } else {
      this.engine.hardDrop();
      return;
    }

    if (active.x === this.prevX) {
      this.stuck++;
      if (this.stuck > 2) {
        this.engine.hardDrop();
        this.stuck = 0;
      }
    } else {
      this.stuck = 0;
    }
    this.prevX = active.x;
  }

  private think(type: PieceType): MoveDecision | null {
    const cfg = LEVELS[this.level];
    const board = this.engine.getBoard();

    // easy はときどきわざと雑な手を選ぶ。
    if (cfg.randomness > 0 && Math.random() < cfg.randomness) {
      const cands = enumeratePlacements(board, type);
      const pick = cands[Math.floor(Math.random() * cands.length)];
      return pick ? { useHold: false, placement: pick.placement } : null;
    }

    return decideMove(board, type, {
      lookahead: cfg.lookahead,
      usePro: cfg.usePro,
      allowHold: cfg.allowHold && !this.didHold,
      hold: this.engine.getHold(),
      next: this.engine.getNextTypes(2),
    });
  }
}
