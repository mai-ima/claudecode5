import type { Replay } from './Recorder';

/** 保存リプレイ（メタデータ付き）。 */
export interface SavedReplay {
  id: string;
  date: number;
  mode: string;
  score: number;
  lines: number;
  replay: Replay;
}

const KEY = 'tetris.replays';
const LIMIT = 20;

/** リプレイの localStorage 保存（最新 LIMIT 件）。 */
export class ReplayStore {
  list(): SavedReplay[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as SavedReplay[]) : [];
    } catch {
      return [];
    }
  }

  save(entry: Omit<SavedReplay, 'id' | 'date'>): void {
    const list = this.list();
    list.unshift({ ...entry, id: `r${Date.now()}`, date: Date.now() });
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
    } catch {
      // 無視。
    }
  }
}
