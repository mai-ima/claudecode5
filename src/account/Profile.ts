/** ローカルプロフィール（将来サーバ同期前提の最小構成）。 */
const KEY = 'tetris.profile';

export interface ProfileData {
  name: string;
  avatarSeed: number;
}

const AVATAR_COLORS = ['#58a6ff', '#a855f7', '#22c55e', '#ef4444', '#f59e0b', '#2dd4bf', '#ff4fa3'];

export class Profile {
  private data: ProfileData;

  constructor() {
    this.data = this.load();
  }

  get name(): string {
    return this.data.name;
  }

  setName(name: string): void {
    this.data.name = name.slice(0, 16) || 'Player';
    this.save();
  }

  /** アバター色（生成）。 */
  avatarColor(): string {
    return AVATAR_COLORS[this.data.avatarSeed % AVATAR_COLORS.length] as string;
  }

  private load(): ProfileData {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { name: 'Player', avatarSeed: 0, ...(JSON.parse(raw) as Partial<ProfileData>) };
    } catch {
      // 既定。
    }
    return { name: 'Player', avatarSeed: Math.floor(Math.random() * 1000) };
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // 無視。
    }
  }
}
