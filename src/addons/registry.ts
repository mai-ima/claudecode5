import { setSkin, setUiStyle } from '../render/theme';
import { PRESET_ADDONS } from './presets';
import type { Addon } from './types';

const KEY = 'tetris.addon';

/** アドオン（本家プリセット）の登録・選択・適用。 */
export class AddonRegistry {
  private addons = new Map<string, Addon>();
  private activeId: string;

  constructor() {
    for (const a of PRESET_ADDONS) this.addons.set(a.id, a);
    this.activeId = this.load() ?? PRESET_ADDONS[0]!.id;
    if (!this.addons.has(this.activeId)) this.activeId = PRESET_ADDONS[0]!.id;
  }

  register(addon: Addon): void {
    this.addons.set(addon.id, addon);
  }

  list(): Addon[] {
    return [...this.addons.values()];
  }

  find(id: string): Addon | undefined {
    return this.addons.get(id);
  }

  getActive(): Addon {
    return this.addons.get(this.activeId) ?? PRESET_ADDONS[0]!;
  }

  /** アドオンを選択し、UIスタイル・ミノスキンを即時反映する。 */
  setActive(id: string): void {
    if (!this.addons.has(id)) return;
    this.activeId = id;
    this.save();
    this.apply();
  }

  /** 現在のアドオンの見た目を適用する。 */
  apply(): void {
    const a = this.getActive();
    setUiStyle(a.uiStyle);
    setSkin(a.minoSkin);
  }

  private load(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, this.activeId);
    } catch {
      // 無視。
    }
  }
}
