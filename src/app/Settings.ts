import type { AiLevel } from '../ai/AiController';

/** ユーザー設定（サウンド・表示オプション・ハンドリング・AI難易度）の永続化。 */
const KEY = 'tetris.settings';

export interface SettingsData {
  soundEnabled: boolean;
  ghost: boolean;
  grid: boolean;
  nextCount: number;
  boardOpacity: number;
  das: number;
  arr: number;
  aiLevel: AiLevel;
}

const DEFAULTS: SettingsData = {
  soundEnabled: true,
  ghost: true,
  grid: true,
  nextCount: 5,
  boardOpacity: 1,
  das: 133,
  arr: 33,
  aiLevel: 'normal',
};

export class Settings {
  private data: SettingsData;

  constructor() {
    this.data = this.load();
  }

  get all(): Readonly<SettingsData> {
    return this.data;
  }

  get soundEnabled(): boolean {
    return this.data.soundEnabled;
  }

  update(patch: Partial<SettingsData>): void {
    this.data = { ...this.data, ...patch };
    this.save();
  }

  private load(): SettingsData {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SettingsData>) };
    } catch {
      // 既定値。
    }
    return { ...DEFAULTS };
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // 無視。
    }
  }
}
