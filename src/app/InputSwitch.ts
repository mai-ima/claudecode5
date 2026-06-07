import type { InputLike } from './Session';

/**
 * 人間入力と内蔵AIを切り替えられる入力器（InputLike）。
 * オートプレイ（AI代行）のオン/オフに使う。アクティブな側だけが attach され update される。
 */
export class InputSwitch implements InputLike {
  private ai = false;
  private target: Window | HTMLElement | undefined;

  constructor(
    private readonly human: InputLike,
    private readonly aiCtl: InputLike,
  ) {}

  private active(): InputLike {
    return this.ai ? this.aiCtl : this.human;
  }

  attach(target?: Window | HTMLElement): void {
    this.target = target;
    this.active().attach(target);
  }

  detach(): void {
    this.active().detach();
  }

  update(dt: number): void {
    this.active().update(dt);
  }

  setAi(on: boolean): void {
    if (on === this.ai) return;
    this.active().detach();
    this.ai = on;
    this.active().attach(this.target);
  }

  isAi(): boolean {
    return this.ai;
  }
}
