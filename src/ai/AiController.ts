import type { InputLike } from '../app/Session';
import { decideMove, enumeratePlacements, searchBestMove } from '../modes/tetris/ai';
import type { MoveDecision } from '../modes/tetris/ai';
import type { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { PieceType } from '../modes/tetris/types';
import { getAiClient } from './worker/aiClient';
import type { AiClient } from './worker/aiClient';

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
  hard: { interval: 34, randomness: 0, searchDepth: 2, beamWidth: 6 },
  // プロ: ホールド込みで先読み＋ビーム＝本物のプロ級（性能と強さの両立）。
  pro: { interval: 14, randomness: 0, searchDepth: 4, beamWidth: 10 },
};

/**
 * テトリス用の内蔵AI操作器（InputLike）。難易度で思考の深さ・速さ・
 * ホールド活用・テトリス/全消し意図が変わる。
 */
export class TetrisAiController implements InputLike {
  private plan: MoveDecision | null = null;
  private planned = false;
  private reqToken = 0;
  private moveAcc = 0;
  private stuck = 0;
  private prevX = Number.NaN;
  private didHold = false;
  private off: (() => void) | null = null;
  private readonly client: AiClient;

  constructor(
    private readonly engine: TetrisEngine,
    private level: AiLevel = 'normal',
  ) {
    this.client = getAiClient();
  }

  setLevel(level: AiLevel): void {
    this.level = level;
  }

  attach(): void {
    this.off = this.engine.events.on('spawn', () => {
      this.plan = null;
      this.planned = false;
      this.didHold = false;
      this.reqToken++; // 直前ピースの応答を無効化。
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

    // 計画は 1 ピースにつき 1 回だけ要求（Worker は非同期、未対応時は同期）。
    if (!this.planned) {
      this.planned = true;
      this.requestPlan(active.type);
    }
    if (!this.plan) return;

    this.moveAcc += dt;
    if (this.moveAcc < LEVELS[this.level].interval) return;
    this.moveAcc = 0;

    // ホールドを使う手なら、まず一度だけホールドして再計画。
    if (this.plan.useHold && !this.didHold) {
      this.engine.hold();
      this.didHold = true;
      this.plan = null;
      this.planned = false; // 入れ替え後のピースで一度だけ再計画。
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

  /** プランを要求（探索が重い上級/プロは Worker、軽い手は同期）。 */
  private requestPlan(type: PieceType): void {
    const cfg = LEVELS[this.level];

    // easy はときどきわざと雑な手。軽いので同期。
    if (cfg.randomness > 0 && Math.random() < cfg.randomness) {
      const cands = enumeratePlacements(this.engine.getBoard(), type);
      const pick = cands[Math.floor(Math.random() * cands.length)];
      this.plan = pick ? { useHold: false, placement: pick.placement } : null;
      return;
    }

    // 深い探索は Worker へ（非同期）。
    if (cfg.searchDepth > 0 && this.client.available()) {
      const token = ++this.reqToken;
      void this.client
        .request({
          cells: this.engine.getBoard().cellsCopy(),
          current: type,
          hold: this.engine.getHold(),
          next: this.engine.getNextTypes(cfg.searchDepth + 1),
          depth: cfg.searchDepth,
          beam: cfg.beamWidth,
          allowHold: !this.didHold,
        })
        .then((move) => {
          if (token !== this.reqToken) return; // 古い応答は破棄。
          this.plan = move ?? this.thinkSync(type);
        });
      return;
    }

    this.plan = this.thinkSync(type);
  }

  private thinkSync(type: PieceType): MoveDecision | null {
    const cfg = LEVELS[this.level];
    const board = this.engine.getBoard();
    if (cfg.searchDepth > 0) {
      const next = this.engine.getNextTypes(cfg.searchDepth + 1);
      const move = searchBestMove(
        board,
        type,
        this.engine.getHold(),
        next,
        cfg.searchDepth,
        cfg.beamWidth,
        !this.didHold,
      );
      if (move) return move;
    }
    return decideMove(board, type, {
      allowHold: false,
      hold: this.engine.getHold(),
      next: this.engine.getNextTypes(1),
    });
  }
}
