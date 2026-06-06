/** 効果音 ID と、合成パラメータ（アセット不要の簡易音）。 */
export type SfxId =
  | 'move'
  | 'rotate'
  | 'lock'
  | 'lineClear'
  | 'tetris'
  | 'hold'
  | 'hardDrop'
  | 'levelUp'
  | 'gameOver';

export interface SfxSpec {
  freq: number;
  durationMs: number;
  type: OscillatorType;
  /** 終端周波数（スイープ）。 */
  endFreq?: number;
}

export const SFX: Record<SfxId, SfxSpec> = {
  move: { freq: 220, durationMs: 30, type: 'square' },
  rotate: { freq: 330, durationMs: 40, type: 'square' },
  lock: { freq: 160, durationMs: 60, type: 'triangle' },
  lineClear: { freq: 520, durationMs: 140, type: 'sawtooth', endFreq: 720 },
  tetris: { freq: 440, durationMs: 260, type: 'sawtooth', endFreq: 880 },
  hold: { freq: 400, durationMs: 50, type: 'sine' },
  hardDrop: { freq: 120, durationMs: 50, type: 'triangle' },
  levelUp: { freq: 600, durationMs: 200, type: 'sine', endFreq: 1000 },
  gameOver: { freq: 300, durationMs: 500, type: 'sawtooth', endFreq: 80 },
};
