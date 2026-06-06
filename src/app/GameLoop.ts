import { STEP_MS } from '../config/constants';

/**
 * 固定タイムステップのゲームループ（rAF + アキュムレータ）。
 * 表示リフレッシュレートに依存せず、シミュレーションを決定的に進める。
 */
export class GameLoop {
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private running = false;

  constructor(
    private readonly step: (dt: number) => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    // タブ復帰などの巨大デルタを抑制（スパイラル防止）。
    const delta = Math.min(now - this.lastTime, 100);
    this.lastTime = now;
    this.accumulator += delta;

    while (this.accumulator >= STEP_MS) {
      this.step(STEP_MS);
      this.accumulator -= STEP_MS;
    }
    this.render();
    this.rafId = requestAnimationFrame(this.frame);
  };
}
