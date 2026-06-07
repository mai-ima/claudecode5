import type { SfxId, SfxSpec } from './sounds';

/**
 * プリセット別サウンドテーマ。基本 SFX（sounds.ts）に対する上書き。
 * AudioManager がマージして再生する。
 */
export type SoundTheme = Partial<Record<SfxId, Partial<SfxSpec>>>;

export const SOUND_THEMES: Record<string, SoundTheme> = {
  // 既定（ぷよテト風: 明るめ）。
  puyotetro: {
    lineClear: { type: 'sine', freq: 660, endFreq: 990 },
    rotate: { type: 'sine', freq: 420 },
    levelUp: { type: 'sine', freq: 700, endFreq: 1200 },
  },
  guideline: {},
  // 競技風: クリックっぽく短く。
  tetrio: {
    move: { type: 'square', freq: 180, durationMs: 18 },
    rotate: { type: 'square', freq: 300, durationMs: 24 },
    lock: { type: 'square', freq: 140, durationMs: 40 },
    hardDrop: { type: 'square', freq: 90, durationMs: 40 },
  },
  // レトロ: 矩形波チップチューン。
  'classic-nes': {
    move: { type: 'square', freq: 200 },
    rotate: { type: 'square', freq: 350 },
    lock: { type: 'square', freq: 150 },
    lineClear: { type: 'square', freq: 520, endFreq: 680 },
    tetris: { type: 'square', freq: 440, endFreq: 880 },
    levelUp: { type: 'square', freq: 600, endFreq: 1000 },
    gameOver: { type: 'square', freq: 300, endFreq: 70 },
  },
};
