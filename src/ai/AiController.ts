import type { InputLike } from '../app/Session';
import { bestPlacement, enumeratePlacements } from '../modes/tetris/ai';
import type { Placement } from '../modes/tetris/ai';
import type { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { PieceType } from '../modes/tetris/types';

export type AiLevel = 'easy' | 'normal' | 'hard';

const MOVE_INTERVAL: Record<AiLevel, number> = {
  easy: 170,
  normal: 70,
  hard: 35,
};

/**
 * テトリス用の内蔵AI操作器。`InputLike` を実装し、人間の入力と同じ口で
 * エンジンを操作する（セッションにそのまま差し込める）。
 */
export class TetrisAiController implements InputLike {
  private plan: Placement | null = null;
  private moveAcc = 0;
  private stuck = 0;
  private prevX = Number.NaN;
  private off: (() => void) | null = null;

  constructor(
    private readonly engine: TetrisEngine,
    private level: AiLevel = 'normal',
  ) {}

  setLevel(level: AiLevel): void {
    this.level = level;
  }

  attach(): void {
    // spawn ごとに再計画。
    this.off = this.engine.events.on('spawn', () => {
      this.plan = null;
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
    if (this.moveAcc < MOVE_INTERVAL[this.level]) return;
    this.moveAcc = 0;

    // 目標へ 1 アクションずつ寄せる。
    if (active.rotation !== this.plan.rotation) {
      this.engine.rotateCW();
      return;
    }
    if (active.x < this.plan.x) {
      this.engine.moveRight();
    } else if (active.x > this.plan.x) {
      this.engine.moveLeft();
    } else {
      this.engine.hardDrop();
      return;
    }

    // 移動が詰まったら（壁等）ハードドロップでフォールバック。
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

  private think(type: PieceType): Placement | null {
    const board = this.engine.getBoard();
    // easy はときどきわざと雑な手を選ぶ。
    if (this.level === 'easy' && Math.random() < 0.28) {
      const cands = enumeratePlacements(board, type);
      const pick = cands[Math.floor(Math.random() * cands.length)];
      return pick ? pick.placement : null;
    }
    const next = this.engine.getNextTypes(1)[0];
    return bestPlacement(board, type, {
      lookahead: this.level === 'hard',
      ...(next ? { nextType: next } : {}),
    });
  }
}
