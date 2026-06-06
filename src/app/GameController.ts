import type { AudioManager } from '../audio/AudioManager';
import type { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { HighScoreStore } from './HighScoreStore';

/**
 * エンジンの一過性イベントを購読し、音と外部コールバックへ橋渡しする。
 * Snapshot（状態）は描画側が直接読む。本クラスは「瞬間」を扱う。
 */
export class GameController {
  private unsubscribers: Array<() => void> = [];

  constructor(
    private readonly engine: TetrisEngine,
    private readonly audio: AudioManager,
    private readonly highScores: HighScoreStore,
    private readonly callbacks: {
      onGameOver?: (score: number, isHighScore: boolean) => void;
      onLevelUp?: (level: number) => void;
    } = {},
  ) {
    this.subscribe();
  }

  private subscribe(): void {
    const e = this.engine.events;
    this.unsubscribers.push(
      e.on('move', () => this.audio.play('move')),
      e.on('rotate', () => this.audio.play('rotate')),
      e.on('lock', () => this.audio.play('lock')),
      e.on('hold', () => this.audio.play('hold')),
      e.on('hardDrop', () => this.audio.play('hardDrop')),
      e.on('lineClear', ({ lines }) => this.audio.play(lines >= 4 ? 'tetris' : 'lineClear')),
      e.on('levelUp', ({ level }) => {
        this.audio.play('levelUp');
        this.callbacks.onLevelUp?.(level);
      }),
      e.on('gameOver', () => {
        this.audio.play('gameOver');
        const score = this.engine.getScore();
        const isHigh = this.highScores.submit(score);
        this.callbacks.onGameOver?.(score, isHigh);
      }),
    );
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
  }
}
