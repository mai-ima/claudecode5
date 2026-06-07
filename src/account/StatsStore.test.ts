import { describe, expect, it } from 'vitest';
import { StatsStore } from './StatsStore';

describe('StatsStore', () => {
  it('スプリントの最速のみ更新する', () => {
    const s = new StatsStore();
    s.recordSolo({ kind: 'solo', mode: 'sprint', score: 0, lines: 40, timeMs: 60000, cleared: true });
    s.recordSolo({ kind: 'solo', mode: 'sprint', score: 0, lines: 40, timeMs: 45000, cleared: true });
    s.recordSolo({ kind: 'solo', mode: 'sprint', score: 0, lines: 40, timeMs: 80000, cleared: true });
    expect(s.all.sprintBestMs).toBe(45000);
  });

  it('未達スプリントはベスト更新しない', () => {
    const s = new StatsStore();
    s.recordSolo({ kind: 'solo', mode: 'sprint', score: 0, lines: 10, timeMs: 30000, cleared: false });
    expect(s.all.sprintBestMs).toBeNull();
  });

  it('レーティングは勝ちで上がり負けで下がる', () => {
    const win = new StatsStore();
    const base = win.all.rating;
    win.recordVersus({ kind: 'versus', youWon: true, rated: true, opponentRating: 1000 });
    expect(win.all.rating).toBeGreaterThan(base);
    expect(win.all.wins).toBe(1);

    const lose = new StatsStore();
    lose.recordVersus({ kind: 'versus', youWon: false, rated: true, opponentRating: 1000 });
    expect(lose.all.rating).toBeLessThan(base);
    expect(lose.all.losses).toBe(1);
  });

  it('非レートやドローはレーティングを動かさない', () => {
    const s = new StatsStore();
    const base = s.all.rating;
    s.recordVersus({ kind: 'versus', youWon: true, rated: false });
    expect(s.all.rating).toBe(base);
    s.recordVersus({ kind: 'versus', youWon: null, rated: true });
    expect(s.all.rating).toBe(base);
  });
});
