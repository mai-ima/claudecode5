import type { InputLike } from '../app/Session';
import { decideMove, enumeratePlacements, searchBestMove } from '../modes/tetris/ai';
import type { MoveDecision } from '../modes/tetris/ai';
import type { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { PieceType } from '../modes/tetris/types';

export type AiLevel = 'easy' | 'normal' | 'hard' | 'pro';

interface LevelCfg {
  interval: number;
  randomness: number;
  /** ビーム探索の深さ（0=単純最善手）。 */
  searchDepth: number;
  beamWidth: number;
}

const LEVELS: Record<AiLevel, LevelCfg> = {
  easy: { interval: 200, randomness: 0.3, searchDepth: 0, beamWidth: 1 },
  normal: { interval: 80, randomness: 0.04, searchDepth: 0, beamWidth: 1 },
  hard: { interval: 34, randomness: 0, searchDepth: 2, beamWidth: 8 },
  // プロ: ホールド込みで先読み（next 全部）＋広いビーム＝本物のプロ級。
  pro: { interval: 14, randomness: 0, searchDepth: 6, beamWidth: 16 },
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

    // 上級/プロはホールド込みビーム探索で複数手先を読む。
    if (cfg.searchDepth > 0) {
      const next = this.engine.getNextTypes(cfg.searchDepth + 1);
      const move = searchBestMove(board, type, this.engine.getHold(), next, cfg.searchDepth, cfg.beamWidth);
      if (move) {
        // 既にこのピースでホールド済みなら再ホールドしない。
        return this.didHold ? { useHold: false, placement: move.placement } : move;
      }
    }

    return decideMove(board, type, {
      allowHold: false,
      hold: this.engine.getHold(),
      next: this.engine.getNextTypes(1),
    });
  }
}
