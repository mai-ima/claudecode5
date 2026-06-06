/** ハイスコアの localStorage 永続化。 */
const KEY = 'tetris.highscore';

export class HighScoreStore {
  get(): number {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  }

  /** 新記録なら保存して true を返す。 */
  submit(score: number): boolean {
    if (score <= this.get()) return false;
    try {
      localStorage.setItem(KEY, String(score));
    } catch {
      // 保存不可は無視。
    }
    return true;
  }
}
