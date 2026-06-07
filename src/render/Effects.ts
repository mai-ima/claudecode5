/**
 * 一過性の視覚エフェクト（画面シェイク・パーティクル）。
 * GameApp が engine イベントで駆動し、毎フレーム update/draw する。
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export class Effects {
  private particles: Particle[] = [];
  private shakeT = 0;
  private shakeDur = 0;
  private shakeMag = 0;

  shake(mag: number, durMs = 250): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeDur = Math.max(this.shakeDur, durMs);
    this.shakeT = Math.max(this.shakeT, durMs);
  }

  burst(x: number, y: number, color: string, count = 18, spread = 1): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (40 + Math.random() * 160) * spread;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0,
        max: 400 + Math.random() * 300,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  update(dt: number): void {
    if (this.shakeT > 0) this.shakeT -= dt;
    const s = dt / 1000;
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.vy += 320 * s; // 重力。
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  shakeOffset(): { x: number; y: number } {
    if (this.shakeT <= 0 || this.shakeDur <= 0) return { x: 0, y: 0 };
    const k = (this.shakeT / this.shakeDur) * this.shakeMag;
    return { x: (Math.random() - 0.5) * 2 * k, y: (Math.random() - 0.5) * 2 * k };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
  }
}
