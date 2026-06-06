/** ユーザー設定（サウンド ON/OFF 等）の永続化。 */
const KEY = 'tetris.settings';

export interface SettingsData {
  soundEnabled: boolean;
  themeName: string;
}

const DEFAULTS: SettingsData = {
  soundEnabled: true,
  themeName: 'classic',
};

export class Settings {
  private data: SettingsData;

  constructor() {
    this.data = this.load();
  }

  get soundEnabled(): boolean {
    return this.data.soundEnabled;
  }

  get themeName(): string {
    return this.data.themeName;
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
