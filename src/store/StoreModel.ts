import type { Catalog } from './Catalog';
import type { Currency } from './Currency';

const OWNED_KEY = 'tetris.owned';
const EQUIPPED_KEY = 'tetris.equipped';

export type PurchaseResult = 'ok' | 'already-owned' | 'insufficient' | 'not-found';

/**
 * 模擬ストアのモデル。通貨で商品（スキン）を購入し、所持・装備を管理する。
 * 無料(price=0)の商品は最初から所持扱い。
 */
export class StoreModel {
  private owned: Set<string>;
  private equipped: string;

  constructor(
    private readonly catalog: Catalog,
    private readonly currency: Currency,
  ) {
    this.owned = this.loadOwned();
    // 無料商品は常に所持。
    for (const entry of this.catalog.entries()) {
      if (entry.price === 0) this.owned.add(entry.id);
    }
    this.equipped = this.loadEquipped() ?? 'guideline';
  }

  isOwned(id: string): boolean {
    return this.owned.has(id);
  }

  getEquipped(): string {
    return this.equipped;
  }

  /** 商品を購入する。 */
  buy(id: string): PurchaseResult {
    const entry = this.catalog.find(id);
    if (!entry) return 'not-found';
    if (this.owned.has(id)) return 'already-owned';
    if (!this.currency.spend(entry.price)) return 'insufficient';
    this.owned.add(id);
    this.saveOwned();
    return 'ok';
  }

  /** 所持している商品を装備する。 */
  equip(id: string): boolean {
    if (!this.owned.has(id)) return false;
    this.equipped = id;
    this.saveEquipped();
    return true;
  }

  private loadOwned(): Set<string> {
    try {
      const raw = localStorage.getItem(OWNED_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private saveOwned(): void {
    try {
      localStorage.setItem(OWNED_KEY, JSON.stringify([...this.owned]));
    } catch {
      // 無視。
    }
  }

  private loadEquipped(): string | null {
    try {
      return localStorage.getItem(EQUIPPED_KEY);
    } catch {
      return null;
    }
  }

  private saveEquipped(): void {
    try {
      localStorage.setItem(EQUIPPED_KEY, this.equipped);
    } catch {
      // 無視。
    }
  }
}
