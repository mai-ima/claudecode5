import { Emitter } from '../../shared/events';
import type { EngineView } from '../../shared/engineView';
import type { Rng } from '../../shared/rng';
import { createDefaultRng } from '../../shared/rng';
import type { Snapshot } from '../../shared/snapshot';
import { garbageFromScore, planClear } from './chain';
import { dropGarbage } from './garbage';
import { PUYO_BUFFER, PuyoBoard } from './PuyoBoard';
import { buildPuyoSnapshot } from './toSnapshot';
import { childOffset, PUYO_COLORS } from './types';
import type { PuyoColor, PuyoOrientation, PuyoPair } from './types';

const SPAWN_X = 2;
const SPAWN_Y = PUYO_BUFFER - 1;
const FALL_INTERVAL = 700;
const SOFT_FALL_INTERVAL = 40;
const LOCK_DELAY = 400;
const CHAIN_BEAT_MS = 220;
const NEXT_PREVIEW = 2;

type PuyoPhase = 'ready' | 'playing' | 'paused' | 'resolving' | 'gameover';

export interface PuyoEvents extends Record<string, unknown> {
  move: undefined;
  rotate: undefined;
  lock: undefined;
  chain: { count: number; score: number };
  garbageSent: { amount: number };
  spawn: undefined;
  gameOver: undefined;
}

interface PairColors {
  axisColor: PuyoColor;
  childColor: PuyoColor;
}

export interface PuyoEngineOptions {
  rng?: Rng;
  onSendGarbage?: (amount: number) => void;
}

/** ぷよぷよ・エンジン（テトリスとは完全に独立、DOM 非依存）。 */
export class PuyoEngine implements EngineView {
  readonly events = new Emitter<PuyoEvents>();

  private board = new PuyoBoard();
  private rng: Rng;
  private active: PuyoPair | null = null;
  private queue: PairColors[] = [];
  private phase: PuyoPhase = 'ready';
  private score = 0;
  private maxChain = 0;

  private fallAccumulator = 0;
  private lockTimer = 0;
  private resting = false;
  private softDrop = false;

  private beatTimer = 0;
  private resolveChainIndex = 0;
  private dropScore = 0;
  private clearing = new Set<number>();

  private garbageQueue = 0;
  private readonly onSendGarbage: ((amount: number) => void) | undefined;

  constructor(options: PuyoEngineOptions = {}) {
    this.rng = options.rng ?? createDefaultRng();
    this.onSendGarbage = options.onSendGarbage;
  }

  start(): void {
    this.phase = 'playing';
    this.spawn();
  }

  reset(): void {
    this.board = new PuyoBoard();
    this.active = null;
    this.queue = [];
    this.score = 0;
    this.maxChain = 0;
    this.fallAccumulator = 0;
    this.lockTimer = 0;
    this.resting = false;
    this.softDrop = false;
    this.beatTimer = 0;
    this.clearing.clear();
    this.garbageQueue = 0;
    this.phase = 'ready';
  }

  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  isGameOver(): boolean {
    return this.phase === 'gameover';
  }

  getScore(): number {
    return this.score;
  }

  getBoard(): PuyoBoard {
    return this.board;
  }

  queueGarbage(amount: number): void {
    if (amount > 0) this.garbageQueue += amount;
  }

  // ---- 入力 ----------------------------------------------------------

  moveLeft(): void {
    this.shift(-1);
  }
  moveRight(): void {
    this.shift(1);
  }
  setSoftDrop(active: boolean): void {
    this.softDrop = active;
  }

  rotateCW(): void {
    this.rotate(1);
  }
  rotateCCW(): void {
    this.rotate(3);
  }
  quickTurn(): void {
    this.rotate(2);
  }

  hardDrop(): void {
    if (this.phase !== 'playing' || !this.active) return;
    while (this.canPlace({ ...this.active, y: this.active.y + 1 })) {
      this.active = { ...this.active, y: this.active.y + 1 };
    }
    this.lock();
  }

  // ---- 時間進行 ------------------------------------------------------

  tick(dtMs: number): void {
    if (this.phase === 'resolving') {
      this.tickResolving(dtMs);
      return;
    }
    if (this.phase !== 'playing' || !this.active) return;

    this.fallAccumulator += dtMs;
    const interval = this.softDrop ? SOFT_FALL_INTERVAL : FALL_INTERVAL;
    while (this.fallAccumulator >= interval) {
      this.fallAccumulator -= interval;
      if (this.canPlace({ ...this.active, y: this.active.y + 1 })) {
        this.active = { ...this.active, y: this.active.y + 1 };
        this.resting = false;
        this.lockTimer = 0;
      } else {
        this.resting = true;
        break;
      }
    }

    if (this.resting) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= LOCK_DELAY) this.lock();
    }
  }

  getSnapshot(): Snapshot {
    return buildPuyoSnapshot({
      board: this.board,
      active: this.active,
      ghost: this.active ? this.computeGhost(this.active) : null,
      nextPairs: this.peekQueue(NEXT_PREVIEW),
      clearing: this.clearing,
      hud: {
        score: this.score,
        level: 1,
        lines: this.maxChain,
        combo: 0,
        backToBack: false,
        ...(this.maxChain > 0 ? { lastClearLabel: `${this.maxChain} Chain` } : {}),
      },
      garbageQueue: this.garbageQueue,
      phase: this.phase === 'resolving' ? 'playing' : this.phase === 'ready' ? 'ready' : this.phase,
    });
  }

  // ---- 内部 ----------------------------------------------------------

  private shift(dx: number): void {
    if (this.phase !== 'playing' || !this.active) return;
    const moved = { ...this.active, x: this.active.x + dx };
    if (this.canPlace(moved)) {
      this.active = moved;
      this.resetLockOnAction();
      this.events.emit('move', undefined);
    }
  }

  private rotate(delta: number): void {
    if (this.phase !== 'playing' || !this.active) return;
    const orientation = ((this.active.orientation + delta) % 4) as PuyoOrientation;
    const base = { ...this.active, orientation };
    // キック候補: そのまま → 軸を逆方向へ押す → 上へ押す。
    const off = childOffset(orientation);
    const candidates: PuyoPair[] = [
      base,
      { ...base, x: base.x - off.dx },
      { ...base, y: base.y - off.dy },
      { ...base, x: base.x - off.dx, y: base.y - off.dy },
    ];
    for (const cand of candidates) {
      if (this.canPlace(cand)) {
        this.active = cand;
        this.resetLockOnAction();
        this.events.emit('rotate', undefined);
        return;
      }
    }
  }

  private resetLockOnAction(): void {
    if (this.resting && this.active && this.canPlace({ ...this.active, y: this.active.y + 1 })) {
      this.resting = false;
    }
    this.lockTimer = 0;
  }

  private canPlace(pair: PuyoPair): boolean {
    const off = childOffset(pair.orientation);
    return (
      this.board.isEmpty(pair.x, pair.y) &&
      this.board.isEmpty(pair.x + off.dx, pair.y + off.dy)
    );
  }

  private computeGhost(pair: PuyoPair): PuyoPair {
    let ghost = pair;
    while (this.canPlace({ ...ghost, y: ghost.y + 1 })) {
      ghost = { ...ghost, y: ghost.y + 1 };
    }
    return ghost;
  }

  private lock(): void {
    if (!this.active) return;
    const off = childOffset(this.active.orientation);
    this.board.setColor(this.active.x, this.active.y, this.active.axisColor);
    this.board.setColor(this.active.x + off.dx, this.active.y + off.dy, this.active.childColor);
    this.active = null;
    this.events.emit('lock', undefined);

    // 連鎖解決フェーズへ。
    this.phase = 'resolving';
    this.resolveChainIndex = 0;
    this.dropScore = 0;
    this.maxChain = 0;
    this.beatTimer = 0;
    this.board.applyGravity();
  }

  private tickResolving(dtMs: number): void {
    this.beatTimer -= dtMs;
    if (this.beatTimer > 0) return;
    this.beatTimer = CHAIN_BEAT_MS;

    // フラッシュ表示中だったセルを実際に消去して落下させる。
    if (this.clearing.size > 0) {
      for (const idx of this.clearing) {
        this.board.clearCell(idx % this.board.width, Math.floor(idx / this.board.width));
      }
      this.clearing.clear();
      this.board.applyGravity();
      return;
    }

    // 次の連鎖を判定し、消えるセルを点滅登録（消去は次ビート）。
    this.resolveChainIndex++;
    const plan = planClear(this.board, this.resolveChainIndex);
    if (plan) {
      this.score += plan.step.score;
      this.dropScore += plan.step.score;
      this.maxChain = plan.step.chain;
      this.clearing = new Set(plan.cells);
      return;
    }

    // 連鎖終了。
    if (this.maxChain > 0) {
      this.events.emit('chain', { count: this.maxChain, score: this.dropScore });
      const send = garbageFromScore(this.dropScore);
      this.settleGarbage(send);
    } else {
      this.settleGarbage(0);
    }
    this.spawn();
  }

  /** 送る/受けるおじゃまの相殺と落下。 */
  private settleGarbage(send: number): void {
    let outgoing = send;
    if (this.garbageQueue > 0 && outgoing > 0) {
      const offset = Math.min(this.garbageQueue, outgoing);
      this.garbageQueue -= offset;
      outgoing -= offset;
    }
    if (outgoing > 0 && this.onSendGarbage) {
      this.onSendGarbage(outgoing);
      this.events.emit('garbageSent', { amount: outgoing });
    }
    if (this.garbageQueue > 0) {
      const drop = Math.min(this.garbageQueue, 30);
      this.garbageQueue -= drop;
      dropGarbage(this.board, drop, this.rng);
    }
  }

  private spawn(): void {
    this.phase = 'playing';
    const colors = this.nextFromQueue();
    const pair: PuyoPair = {
      axisColor: colors.axisColor,
      childColor: colors.childColor,
      x: SPAWN_X,
      y: SPAWN_Y + 1,
      orientation: 0,
    };
    this.fallAccumulator = 0;
    this.lockTimer = 0;
    this.resting = false;
    if (!this.canPlace(pair)) {
      this.phase = 'gameover';
      this.events.emit('gameOver', undefined);
      return;
    }
    this.active = pair;
    this.events.emit('spawn', undefined);
  }

  private nextFromQueue(): PairColors {
    this.fillQueue(NEXT_PREVIEW + 1);
    return this.queue.shift() as PairColors;
  }

  private peekQueue(n: number): PairColors[] {
    this.fillQueue(n);
    return this.queue.slice(0, n);
  }

  private fillQueue(n: number): void {
    while (this.queue.length < n) {
      this.queue.push({
        axisColor: PUYO_COLORS[this.rng.int(PUYO_COLORS.length)] as PuyoColor,
        childColor: PUYO_COLORS[this.rng.int(PUYO_COLORS.length)] as PuyoColor,
      });
    }
  }
}
