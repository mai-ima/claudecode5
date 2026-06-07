import { beforeEach, describe, expect, it } from 'vitest';
import { PluginRegistry } from '../plugins/registry';
import { skinPlugin } from '../plugins/skins';
import { Catalog } from './Catalog';
import { Currency } from './Currency';
import { StoreModel } from './StoreModel';

function setup(coins: number): { store: StoreModel; currency: Currency; catalog: Catalog } {
  const registry = new PluginRegistry();
  registry.register(skinPlugin);
  const catalog = new Catalog(registry);
  const currency = new Currency(coins);
  const store = new StoreModel(catalog, currency);
  return { store, currency, catalog };
}

describe('Currency', () => {
  it('earn / spend が残高を変える', () => {
    const c = new Currency(0);
    c.earn(100);
    expect(c.get()).toBe(100);
    expect(c.spend(40)).toBe(true);
    expect(c.get()).toBe(60);
    expect(c.spend(1000)).toBe(false);
    expect(c.get()).toBe(60);
  });
});

describe('Catalog', () => {
  it('登録スキンを商品として返す', () => {
    const { catalog } = setup(0);
    const ids = catalog.entries().map((e) => e.id);
    expect(ids).toContain('guideline');
    expect(ids).toContain('neon');
  });
});

describe('StoreModel', () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => {
    env = setup(1000);
  });

  it('無料スキンは最初から所持・装備可能', () => {
    expect(env.store.isOwned('guideline')).toBe(true);
    expect(env.store.getEquipped()).toBe('guideline');
  });

  it('十分な残高で購入できる', () => {
    expect(env.store.buy('neon')).toBe('ok');
    expect(env.store.isOwned('neon')).toBe(true);
    expect(env.currency.get()).toBe(500);
  });

  it('残高不足は insufficient', () => {
    const poor = setup(100);
    expect(poor.store.buy('neon')).toBe('insufficient');
    expect(poor.store.isOwned('neon')).toBe(false);
  });

  it('二重購入は already-owned', () => {
    env.store.buy('neon');
    expect(env.store.buy('neon')).toBe('already-owned');
  });

  it('存在しない商品は not-found', () => {
    expect(env.store.buy('nope')).toBe('not-found');
  });

  it('所持品のみ装備でき、未所持は不可', () => {
    expect(env.store.equip('neon')).toBe(false);
    env.store.buy('neon');
    expect(env.store.equip('neon')).toBe(true);
    expect(env.store.getEquipped()).toBe('neon');
  });
});
