/** ゲーム内通貨ウォレット（localStorage 永続化）。実決済なし。 */
const KEY = 'tetris.coins';

export class Currency {
  private balance: number;

  constructor(initial?: number) {
    this.balance = initial ?? this.load();
  }

  get(): number {
    return this.balance;
  }

  earn(amount: number): void {
    if (amount <= 0) return;
    this.balance += Math.floor(amount);
    this.save();
  }

  /** 残高が足りれば減算して true。 */
  spend(amount: number): boolean {
    if (amount < 0 || this.balance < amount) return false;
    this.balance -= amount;
    this.save();
    return true;
  }

  private load(): number {
    try {
      return Number(localStorage.getItem(KEY)) || 0;
    } catch {
      return 0;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, String(this.balance));
    } catch {
      // 無視。
    }
  }
}
