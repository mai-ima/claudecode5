import type { Plugin, Skin } from './api';

/**
 * プラグインのレジストリ。登録されたプラグインからスキンを集約する。
 * コアロジックに触れないため、登録順や有無でゲーム挙動は変わらない。
 */
export class PluginRegistry {
  private plugins = new Map<string, Plugin>();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  list(): Plugin[] {
    return [...this.plugins.values()];
  }

  /** 全プラグインのスキンを集約して返す。 */
  allSkins(): Skin[] {
    const skins: Skin[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.skins) skins.push(...plugin.skins);
    }
    return skins;
  }

  findSkin(id: string): Skin | undefined {
    return this.allSkins().find((s) => s.id === id);
  }
}
