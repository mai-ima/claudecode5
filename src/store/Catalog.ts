import type { PluginRegistry } from '../plugins/registry';

export interface CatalogEntry {
  id: string;
  name: string;
  price: number;
  kind: 'skin';
}

/** 登録済みプラグインのスキンから購入カタログを構築する。 */
export class Catalog {
  constructor(private readonly registry: PluginRegistry) {}

  entries(): CatalogEntry[] {
    return this.registry.allSkins().map((skin) => ({
      id: skin.id,
      name: skin.name,
      price: skin.price,
      kind: 'skin' as const,
    }));
  }

  find(id: string): CatalogEntry | undefined {
    return this.entries().find((e) => e.id === id);
  }
}
