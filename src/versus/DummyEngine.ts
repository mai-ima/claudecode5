import type { EngineView } from '../shared/engineView';
import type { Snapshot } from '../shared/snapshot';
import { emptyCell } from '../shared/snapshot';

/**
 * 受信した Snapshot を保持・横流しするだけの「操り人形」エンジン。
 *
 * オンライン対戦で相手席に刺す。内部シミュレーションは持たず、
 * NetClient から届いた Snapshot をそのまま描画に渡す。
 * これでローカル 2P（本物 2 つ）とオンライン（本物 + Dummy）の非対称性を吸収する。
 */
export class DummyEngine implements EngineView {
  private snapshot: Snapshot;
  private gameOver = false;

  constructor(width = 10, height = 20) {
    this.snapshot = DummyEngine.blankSnapshot(width, height);
  }

  setSnapshot(snapshot: Snapshot): void {
    this.snapshot = snapshot;
    if (snapshot.phase === 'gameover') this.gameOver = true;
  }

  markGameOver(): void {
    this.gameOver = true;
  }

  getSnapshot(): Snapshot {
    return this.snapshot;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  static blankSnapshot(width: number, height: number): Snapshot {
    const grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => emptyCell()),
    );
    return {
      grid,
      next: [],
      hold: null,
      hud: { score: 0, level: 1, lines: 0, combo: 0, backToBack: false },
      garbageQueue: 0,
      phase: 'ready',
    };
  }
}
