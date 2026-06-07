import { linesToLevelUp } from '../../config/scoring';
import { Emitter } from '../../shared/events';
import type { EngineView } from '../../shared/engineView';
import type { Rng } from '../../shared/rng';
import { createDefaultRng } from '../../shared/rng';
import type { Snapshot } from '../../shared/snapshot';
import { SevenBag } from './bag';
import { makeRuleSet } from './ruleset';
import type { TetrisRuleSet } from './ruleset';
import { ccw, cw, flip, movedPiece, pieceCells, spawnPiece } from './piece';
import { computeLockScore } from './scoring';
import { tryRotate } from './srs';
import { TetrisBoard } from './TetrisBoard';
import { buildSnapshot } from './toSnapshot';
import { detectTSpin } from './tspin';
import type { ActivePiece, KickResult, PieceType, Rotation, TSpinResult } from './types';
import type { Phase } from './stateMachine';
import { canTransition } from './stateMachine';

/** エンジンが発火する一過性イベント。Audio / エフェクト層が購読する。 */
export interface TetrisEvents extends Record<string, unknown> {
  move: { dir: -1 | 1 };
  softDrop: undefined;
  rotate: { rotation: Rotation };
  lock: { type: PieceType };
  lineClear: { lines: number; tspin: TSpinResult; label?: string };
  levelUp: { level: number };
  hold: { type: PieceType };
  hardDrop: { distance: number };
  combo: { count: number };
  backToBack: { active: boolean };
  gameOver: undefined;
  spawn: { type: PieceType };
}

export interface TetrisEngineOptions {
  rng?: Rng;
  startLevel?: number;
  /** ルールセット（本家プリセット）。省略時は既定（ガイドライン相当）。 */
  rules?: Partial<TetrisRuleSet>;
}

/**
 * 単一プレイヤーのテトリス・エンジン（DOM 非依存）。
 * 状態は getSnapshot() で公開し、瞬間は events で発火する。
 */
export class TetrisEngine implements EngineView {
  readonly events = new Emitter<TetrisEvents>();

  private board = new TetrisBoard();
  private bag: SevenBag;
  private rng: Rng;

  private active: ActivePiece | null = null;
  private holdType: PieceType | null = null;
  private holdUsed = false;

  private phase: Phase = 'ready';
  private score = 0;
  private level: number;
  private lines = 0;
  private comboCount = -1;
  private backToBack = false;
  private lastClearLabel: string | undefined;

  // タイマー（ms）。
  private gravityAccumulator = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private resting = false;
  private lineClearTimer = 0;
  private clearingRows: number[] = [];

  private softDropActive = false;
  private lastActionWasRotation = false;
  private lastKick: KickResult | null = null;

  private garbageQueue = 0;
  private readonly rules: TetrisRuleSet;

  constructor(options: TetrisEngineOptions = {}) {
    this.rng = options.rng ?? createDefaultRng();
    this.bag = new SevenBag(this.rng);
    this.level = Math.max(1, options.startLevel ?? 1);
    this.rules = makeRuleSet(options.rules);
  }

  /** 適用中のルールセット（入力ハンドリング等の参照用）。 */
  getRules(): TetrisRuleSet {
    return this.rules;
  }

  // ---- ライフサイクル -------------------------------------------------

  start(): void {
    this.setPhase('playing');
    this.spawnNext();
  }

  reset(): void {
    this.board = new TetrisBoard();
    this.active = null;
    this.holdType = null;
    this.holdUsed = false;
    this.score = 0;
    this.lines = 0;
    this.comboCount = -1;
    this.backToBack = false;
    this.lastClearLabel = undefined;
    this.gravityAccumulator = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.resting = false;
    this.lineClearTimer = 0;
    this.clearingRows = [];
    this.softDropActive = false;
    this.garbageQueue = 0;
    this.phase = 'ready';
  }

  togglePause(): void {
    if (this.phase === 'playing' && canTransition(this.phase, 'paused')) {
      this.setPhase('paused');
    } else if (this.phase === 'paused' && canTransition(this.phase, 'playing')) {
      this.setPhase('playing');
    }
  }

  isGameOver(): boolean {
    return this.phase === 'gameover';
  }

  /** 盤面への参照（おじゃま適用・テスト・観戦用）。 */
  getBoard(): TetrisBoard {
    return this.board;
  }

  /** AI 用: 現在のアクティブピースのコピー（無ければ null）。 */
  getActive(): ActivePiece | null {
    return this.active ? { ...this.active } : null;
  }

  /** AI 用: ホールド中のピース種（無ければ null）。 */
  getHold(): PieceType | null {
    return this.holdType;
  }

  /** AI 用: 次に出るピース種を n 個覗き見る。 */
  getNextTypes(n: number): PieceType[] {
    return this.bag.peek(n);
  }

  getPhase(): Phase {
    return this.phase;
  }

  getScore(): number {
    return this.score;
  }

  getLevel(): number {
    return this.level;
  }

  getLines(): number {
    return this.lines;
  }

  // ---- 入力コマンド ---------------------------------------------------

  moveLeft(): boolean {
    return this.tryMove(-1, 0, -1);
  }

  moveRight(): boolean {
    return this.tryMove(1, 0, 1);
  }

  setSoftDrop(active: boolean): void {
    this.softDropActive = active;
  }

  rotateCW(): boolean {
    return this.applyRotation(cw(this.activeOrThrow().rotation));
  }

  rotateCCW(): boolean {
    return this.applyRotation(ccw(this.activeOrThrow().rotation));
  }

  rotate180(): boolean {
    if (!this.rules.allow180) return false;
    return this.applyRotation(flip(this.activeOrThrow().rotation));
  }

  hardDrop(): void {
    if (this.phase !== 'playing' || !this.active) return;
    let distance = 0;
    while (this.canMove(0, 1)) {
      this.active = movedPiece(this.active, 0, 1);
      distance++;
    }
    this.score += distance * 2;
    if (distance > 0) this.events.emit('hardDrop', { distance });
    this.lockPiece();
  }

  hold(): void {
    if (this.phase !== 'playing' || !this.active || this.holdUsed) return;
    const current = this.active.type;
    if (this.holdType === null) {
      this.holdType = current;
      this.spawnNext();
    } else {
      const swap = this.holdType;
      this.holdType = current;
      this.active = spawnPiece(swap);
      this.resetPieceTimers();
      if (this.board.collides(pieceCells(this.active))) {
        this.gameOver();
        return;
      }
    }
    this.holdUsed = true;
    this.events.emit('hold', { type: current });
  }

  // ---- 時間進行 -------------------------------------------------------

  /** dtMs ぶん時間を進める。 */
  tick(dtMs: number): void {
    if (this.phase !== 'playing') return;

    // ライン消去アニメーション中は消去完了を待つ。
    if (this.lineClearTimer > 0) {
      this.lineClearTimer -= dtMs;
      if (this.lineClearTimer <= 0) {
        this.finishLineClear();
      }
      return;
    }

    if (!this.active) return;

    // 重力。
    this.gravityAccumulator += dtMs;
    const interval = this.rules.gravityMs(this.level, this.softDropActive);
    while (this.gravityAccumulator >= interval) {
      this.gravityAccumulator -= interval;
      if (this.canMove(0, 1)) {
        this.active = movedPiece(this.active, 0, 1);
        this.lastActionWasRotation = false;
        this.resting = false;
        this.lockTimer = 0;
        if (this.softDropActive) {
          this.score += 1;
          this.events.emit('softDrop', undefined);
        }
      } else {
        this.resting = true;
        break;
      }
    }

    // ロックディレイ。
    if (this.resting) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= this.rules.lockDelay) {
        this.lockPiece();
      }
    }
  }

  // ---- 対戦用 ---------------------------------------------------------

  /** 受信したおじゃまをキューに積む。 */
  queueGarbage(amount: number): void {
    if (amount > 0) this.garbageQueue += amount;
  }

  // ---- スナップショット ----------------------------------------------

  getSnapshot(): Snapshot {
    return buildSnapshot({
      board: this.board,
      active: this.active,
      ghost: this.active ? this.computeGhost(this.active) : null,
      holdType: this.holdType,
      nextTypes: this.bag.peek(this.rules.nextCount),
      clearingRows: this.clearingRows,
      hud: {
        score: this.score,
        level: this.level,
        lines: this.lines,
        combo: Math.max(0, this.comboCount),
        backToBack: this.backToBack,
        ...(this.lastClearLabel !== undefined ? { lastClearLabel: this.lastClearLabel } : {}),
      },
      garbageQueue: this.garbageQueue,
      phase: this.phase === 'ready' ? 'ready' : this.phase,
    });
  }

  // ---- 内部処理 -------------------------------------------------------

  private activeOrThrow(): ActivePiece {
    if (!this.active) throw new Error('no active piece');
    return this.active;
  }

  private setPhase(next: Phase): void {
    if (this.phase === next) return;
    if (!canTransition(this.phase, next)) return;
    this.phase = next;
  }

  private tryMove(dx: number, dy: number, dir: -1 | 0 | 1): boolean {
    if (this.phase !== 'playing' || !this.active) return false;
    if (!this.canMove(dx, dy)) return false;
    this.active = movedPiece(this.active, dx, dy);
    this.lastActionWasRotation = false;
    this.onPieceMovedForLockReset();
    if (dir !== 0) this.events.emit('move', { dir });
    return true;
  }

  private applyRotation(to: Rotation): boolean {
    if (this.phase !== 'playing' || !this.active) return false;
    const outcome = tryRotate(this.board, this.active, to, this.rules.rotationSystem);
    if (!outcome) return false;
    this.active = outcome.piece;
    this.lastKick = outcome.kick;
    this.lastActionWasRotation = true;
    this.onPieceMovedForLockReset();
    this.events.emit('rotate', { rotation: to });
    return true;
  }

  /** 移動/回転時のロックディレイ・リセット処理。 */
  private onPieceMovedForLockReset(): void {
    if (this.resting && this.lockResets < this.rules.lockResetLimit) {
      this.lockTimer = 0;
      this.lockResets++;
    }
    // 接地していたが移動で浮いた場合は接地解除。
    if (this.canMove(0, 1)) {
      this.resting = false;
    }
  }

  private canMove(dx: number, dy: number): boolean {
    if (!this.active) return false;
    const moved = movedPiece(this.active, dx, dy);
    return !this.board.collides(pieceCells(moved));
  }

  private computeGhost(piece: ActivePiece): ActivePiece {
    let ghost = piece;
    while (!this.board.collides(pieceCells(movedPiece(ghost, 0, 1)))) {
      ghost = movedPiece(ghost, 0, 1);
    }
    return ghost;
  }

  private spawnNext(): void {
    const type = this.bag.next();
    this.active = spawnPiece(type);
    this.resetPieceTimers();
    this.holdUsed = false;
    this.events.emit('spawn', { type });
    if (this.board.collides(pieceCells(this.active))) {
      this.gameOver();
    }
  }

  private resetPieceTimers(): void {
    this.gravityAccumulator = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.resting = false;
    this.lastActionWasRotation = false;
    this.lastKick = null;
  }

  private lockPiece(): void {
    if (!this.active) return;
    const piece = this.active;
    const tspin =
      this.rules.spinMode === 'none'
        ? 'none'
        : detectTSpin(this.board, piece, this.lastActionWasRotation, this.lastKick);
    this.board.place(pieceCells(piece), piece.type);
    this.events.emit('lock', { type: piece.type });
    this.active = null;

    const fullRows = this.board.findFullLines();
    const linesCleared = fullRows.length;

    // スコア計算。
    const result = computeLockScore(
      { linesCleared, tspin },
      { level: this.level, combo: Math.max(0, this.comboCount), backToBack: this.backToBack },
    );
    this.score += result.points;

    if (linesCleared > 0) {
      this.comboCount++;
      if (this.comboCount > 0) this.events.emit('combo', { count: this.comboCount });

      const wasB2B = this.backToBack;
      this.backToBack = result.isDifficult;
      if (wasB2B !== this.backToBack) this.events.emit('backToBack', { active: this.backToBack });

      this.lastClearLabel = result.label;
      this.events.emit('lineClear', {
        lines: linesCleared,
        tspin,
        ...(result.label !== undefined ? { label: result.label } : {}),
      });

      // 消去アニメーションへ。
      this.clearingRows = fullRows;
      this.lineClearTimer = this.rules.lineClearDelay;
    } else {
      // T-Spin 0 ラインでも B2B は維持される（難消去扱い）。
      if (result.isDifficult) this.backToBack = true;
      this.comboCount = -1;
      if (tspin !== 'none') this.lastClearLabel = result.label;
      this.applyGarbage();
      this.spawnNext();
    }
  }

  private finishLineClear(): void {
    const cleared = this.board.clearLines(this.clearingRows);
    this.clearingRows = [];
    this.lines += cleared;
    this.updateLevel();
    this.spawnNext();
  }

  private updateLevel(): void {
    while (this.lines >= linesToLevelUp(this.level)) {
      this.level++;
      this.events.emit('levelUp', { level: this.level });
    }
  }

  /** キューされたおじゃま行を盤面下部に挿入する。 */
  private applyGarbage(): void {
    if (this.garbageQueue <= 0) return;
    const amount = this.garbageQueue;
    this.garbageQueue = 0;
    for (let i = 0; i < amount; i++) {
      this.pushGarbageRow();
    }
  }

  private pushGarbageRow(): void {
    // 全行を 1 つ上へずらし、最下行におじゃま（穴 1 つ）を作る。
    const hole = this.rng.int(this.board.width);
    const shifted = new TetrisBoard();
    for (let y = 1; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        const id = this.board.idAt(x, y);
        if (id && id !== 'garbage') {
          shifted.place([{ x, y: y - 1 }], id);
        } else if (id === 'garbage') {
          shifted.setGarbage(x, y - 1);
        }
      }
    }
    for (let x = 0; x < this.board.width; x++) {
      if (x !== hole) shifted.setGarbage(x, this.board.height - 1);
    }
    this.board = shifted;
  }

  private gameOver(): void {
    this.setPhase('gameover');
    this.active = null;
    this.events.emit('gameOver', undefined);
  }
}
