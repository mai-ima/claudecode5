import type { EngineView } from '../shared/engineView';
import { VersusController } from '../versus/VersusController';
import type { Combatant } from '../versus/VersusController';
import type { DummyEngine } from '../versus/DummyEngine';
import type { NetClient } from '../net/NetClient';
import { mulberry32 } from '../shared/rng';
import { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { TetrisRuleSet } from '../modes/tetris/ruleset';
import { applyAction } from '../replay/Player';
import type { Replay } from '../replay/Recorder';
import type { InputLike, Outcome, PlayableEngine, Session } from './Session';

export type GoalType = 'marathon' | 'sprint' | 'ultra';
export interface Goal {
  type: GoalType;
  /** sprint: 目標ライン数。 */
  lines?: number;
  /** ultra: 制限時間(ms)。 */
  timeMs?: number;
}

function fmtTime(ms: number): string {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const cs = Math.floor((t % 1000) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** 1 人プレイ（テトリス or ぷよ）。任意で追加モードの目標を持つ。 */
export class SinglePlayerSession implements Session {
  readonly boardCount = 1;
  private elapsed = 0;
  private cleared = false;

  constructor(
    private readonly engine: PlayableEngine,
    private readonly input: InputLike,
    private readonly goal: Goal = { type: 'marathon' },
  ) {}

  start(): void {
    this.engine.reset();
    this.engine.start();
    this.input.attach();
    this.elapsed = 0;
    this.cleared = false;
  }

  tick(dt: number): void {
    this.input.update(dt);
    this.engine.tick(dt);
    if (this.engine.getSnapshot().phase === 'playing') this.elapsed += dt;
  }

  views(): EngineView[] {
    return [this.engine];
  }

  private lines(): number {
    return this.engine.getSnapshot().hud.lines;
  }

  isOver(): boolean {
    if (this.engine.isGameOver()) return true;
    if (this.goal.type === 'sprint' && this.lines() >= (this.goal.lines ?? 40)) {
      this.cleared = true;
      return true;
    }
    if (this.goal.type === 'ultra' && this.elapsed >= (this.goal.timeMs ?? 120000)) {
      this.cleared = true;
      return true;
    }
    return false;
  }

  info(): string[] {
    if (this.goal.type === 'sprint') {
      const left = Math.max(0, (this.goal.lines ?? 40) - this.lines());
      return [`のこり ${left} ライン`, fmtTime(this.elapsed)];
    }
    if (this.goal.type === 'ultra') {
      return [`のこり ${fmtTime((this.goal.timeMs ?? 120000) - this.elapsed)}`];
    }
    return [];
  }

  resultLines(): string[] {
    const score = this.engine.getScore().toLocaleString();
    if (this.goal.type === 'sprint') {
      return this.cleared
        ? [`タイム ${fmtTime(this.elapsed)}`, `スコア ${score}`]
        : [`未達 ${this.lines()}/${this.goal.lines ?? 40} ライン`];
    }
    if (this.goal.type === 'ultra') {
      return [`スコア ${score}`, `タイム ${fmtTime(this.elapsed)}`];
    }
    return [`スコア ${score}`];
  }

  outcome(): Outcome {
    return {
      kind: 'solo',
      mode: this.goal.type,
      score: this.engine.getScore(),
      lines: this.lines(),
      timeMs: this.elapsed,
      cleared: this.cleared,
    };
  }

  togglePause(): void {
    this.engine.togglePause();
  }

  dispose(): void {
    this.input.detach();
  }
}

/** ローカル 2P 対戦（両席に本物のエンジン）。 */
export class LocalVersusSession implements Session {
  readonly boardCount = 2;
  private versus: VersusController;

  constructor(
    private readonly engineA: PlayableEngine,
    private readonly inputA: InputLike,
    private readonly engineB: PlayableEngine,
    private readonly inputB: InputLike,
    combatantA: Combatant,
    combatantB: Combatant,
    private readonly rated: { opponentRating: number } | null = null,
  ) {
    this.versus = new VersusController(combatantA, combatantB);
  }

  start(): void {
    this.engineA.reset();
    this.engineB.reset();
    this.engineA.start();
    this.engineB.start();
    this.inputA.attach();
    this.inputB.attach();
  }

  tick(dt: number): void {
    this.inputA.update(dt);
    this.engineA.tick(dt);
    this.inputB.update(dt);
    this.engineB.tick(dt);
    this.versus.update();
  }

  views(): EngineView[] {
    return this.versus.slots;
  }

  isOver(): boolean {
    return this.versus.update() !== null;
  }

  resultLines(): string[] {
    const winner = this.versus.getWinner();
    return [winner === 0 ? 'プレイヤー1の勝ち！' : 'プレイヤー2の勝ち！'];
  }

  outcome(): Outcome {
    const winner = this.versus.getWinner();
    return {
      kind: 'versus',
      youWon: winner === null ? null : winner === 0,
      rated: this.rated !== null,
      ...(this.rated ? { opponentRating: this.rated.opponentRating } : {}),
    };
  }

  togglePause(): void {
    this.engineA.togglePause();
    this.engineB.togglePause();
  }

  dispose(): void {
    this.inputA.detach();
    this.inputB.detach();
  }
}

/**
 * オンライン対戦（疎結合）。
 * 自分はローカルで進行し、Snapshot と攻撃のみを交換。相手席は DummyEngine。
 */
export class OnlineVersusSession implements Session {
  readonly boardCount = 2;
  private snapshotTimer = 0;
  private sentGameOver = false;
  private readonly snapshotIntervalMs = 100;

  constructor(
    private readonly local: PlayableEngine,
    private readonly input: InputLike,
    private readonly dummy: DummyEngine,
    private readonly net: NetClient,
  ) {}

  start(): void {
    this.local.reset();
    this.local.start();
    this.input.attach();
  }

  tick(dt: number): void {
    this.input.update(dt);
    this.local.tick(dt);

    // 自分の Snapshot を定期送信。
    this.snapshotTimer += dt;
    if (this.snapshotTimer >= this.snapshotIntervalMs) {
      this.snapshotTimer = 0;
      this.net.sendSnapshot(this.local.getSnapshot());
    }

    if (!this.sentGameOver && this.local.isGameOver()) {
      this.sentGameOver = true;
      this.net.sendGameOver();
    }
  }

  views(): EngineView[] {
    return [this.local, this.dummy];
  }

  isOver(): boolean {
    return this.local.isGameOver() || this.dummy.isGameOver();
  }

  resultLines(): string[] {
    if (this.local.isGameOver() && !this.dummy.isGameOver()) return ['あなたの負け…'];
    if (this.dummy.isGameOver() && !this.local.isGameOver()) return ['あなたの勝ち！'];
    return ['引き分け'];
  }

  outcome(): Outcome {
    const youWon =
      this.dummy.isGameOver() && !this.local.isGameOver()
        ? true
        : this.local.isGameOver() && !this.dummy.isGameOver()
          ? false
          : null;
    return { kind: 'versus', youWon, rated: true, opponentRating: 1000 };
  }

  togglePause(): void {
    this.local.togglePause();
  }

  dispose(): void {
    this.input.detach();
    this.net.disconnect();
  }
}

/** リプレイ視聴セッション（記録済み操作を決定的に再生して描画する）。 */
export class ReplaySession implements Session {
  readonly boardCount = 1;
  private engine: TetrisEngine;
  private t = 0;
  private idx = 0;
  private finished = false;
  private readonly endT: number;

  constructor(
    private readonly replay: Replay,
    rules?: Partial<TetrisRuleSet>,
  ) {
    this.engine = new TetrisEngine(
      rules ? { rng: mulberry32(replay.seed), rules } : { rng: mulberry32(replay.seed) },
    );
    this.endT = (replay.events.at(-1)?.t ?? 0) + 2000;
  }

  start(): void {
    this.engine.start();
    this.t = 0;
    this.idx = 0;
    this.finished = false;
  }

  tick(dt: number): void {
    if (this.finished) return;
    this.t += dt;
    while (
      this.idx < this.replay.events.length &&
      (this.replay.events[this.idx] as { t: number }).t <= this.t
    ) {
      applyAction(this.engine, (this.replay.events[this.idx] as { action: Parameters<typeof applyAction>[1] }).action);
      this.idx++;
    }
    this.engine.tick(dt);
    if (this.engine.isGameOver() || (this.idx >= this.replay.events.length && this.t >= this.endT)) {
      this.finished = true;
    }
  }

  views(): EngineView[] {
    return [this.engine];
  }

  isOver(): boolean {
    return this.finished;
  }

  resultLines(): string[] {
    return ['リプレイ終了', `スコア ${this.engine.getScore().toLocaleString()}`];
  }

  info(): string[] {
    return ['REPLAY'];
  }

  togglePause(): void {
    this.engine.togglePause();
  }

  dispose(): void {
    // no-op
  }
}
