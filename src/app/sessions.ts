import type { EngineView } from '../shared/engineView';
import { VersusController } from '../versus/VersusController';
import type { Combatant } from '../versus/VersusController';
import type { DummyEngine } from '../versus/DummyEngine';
import type { NetClient } from '../net/NetClient';
import type { InputLike, PlayableEngine, Session } from './Session';

/** 1 人プレイ（テトリス or ぷよ）。 */
export class SinglePlayerSession implements Session {
  readonly boardCount = 1;

  constructor(
    private readonly engine: PlayableEngine,
    private readonly input: InputLike,
  ) {}

  start(): void {
    this.engine.reset();
    this.engine.start();
    this.input.attach();
  }

  tick(dt: number): void {
    this.input.update(dt);
    this.engine.tick(dt);
  }

  views(): EngineView[] {
    return [this.engine];
  }

  isOver(): boolean {
    return this.engine.isGameOver();
  }

  resultLines(): string[] {
    return [`Score: ${this.engine.getScore()}`];
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
    return [winner === 0 ? 'Player 1 Wins!' : 'Player 2 Wins!'];
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
    if (this.local.isGameOver() && !this.dummy.isGameOver()) return ['You Lose'];
    if (this.dummy.isGameOver() && !this.local.isGameOver()) return ['You Win!'];
    return ['Game Over'];
  }

  togglePause(): void {
    this.local.togglePause();
  }

  dispose(): void {
    this.input.detach();
    this.net.disconnect();
  }
}
