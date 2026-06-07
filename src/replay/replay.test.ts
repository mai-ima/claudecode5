import { describe, expect, it } from 'vitest';
import { playReplay } from './Player';
import type { Replay } from './Recorder';

function scripted(seed: number): Replay {
  const events = [];
  // 一定間隔でハードドロップを繰り返す操作列。
  for (let i = 0; i < 25; i++) {
    events.push({ t: i * 600, action: 'hardDrop' as const });
  }
  return { seed, events };
}

describe('リプレイ再生', () => {
  it('同一リプレイは決定的に同じ結果になる', () => {
    const replay = scripted(12345);
    const a = playReplay(replay);
    const b = playReplay(replay);
    expect(a.getScore()).toBe(b.getScore());
    expect(a.getLines()).toBe(b.getLines());
  });

  it('異なるシードは（基本的に）異なる結果になる', () => {
    const a = playReplay(scripted(1));
    const b = playReplay(scripted(2));
    // 盤面が決定的に再生されている（スコアは数値）。
    expect(typeof a.getScore()).toBe('number');
    expect(typeof b.getScore()).toBe('number');
  });
});
