import { SFX } from './sounds';
import type { SfxId } from './sounds';

/**
 * WebAudio で効果音を合成して鳴らす（外部アセット不要）。
 * 一過性イベントを購読する側がこれを呼ぶ。WebAudio 不可環境では安全に no-op。
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    try {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** ユーザー操作後に呼ぶ（自動再生ポリシー対策）。 */
  resume(): void {
    void this.ctx?.resume();
  }

  play(id: SfxId): void {
    if (this.muted || !this.ctx) return;
    const spec = SFX[id];
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, now);
    if (spec.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, spec.endFreq),
        now + spec.durationMs / 1000,
      );
    }
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.durationMs / 1000);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + spec.durationMs / 1000);
  }
}
