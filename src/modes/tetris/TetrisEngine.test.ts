import { beforeEach, describe, expect, it } from 'vitest';
import { TOTAL_HEIGHT, TIMING } from '../../config/constants';
import { mulberry32 } from '../../shared/rng';
import { TetrisEngine } from './TetrisEngine';

function makeEngine(): TetrisEngine {
  return new TetrisEngine({ rng: mulberry32(1) });
}

describe('TetrisEngine', () => {
  let engine: TetrisEngine;

  beforeEach(() => {
    engine = makeEngine();
    engine.start();
  });

  it('start で playing になりアクティブピースが出る', () => {
    const snap = engine.getSnapshot();
    expect(snap.phase).toBe('playing');
    // 可視グリッド上にブロックが存在する。
    const hasBlock = snap.grid.some((row) => row.some((c) => c.type === 'block'));
    expect(hasBlock).toBe(true);
  });

  it('next と ghost がスナップショットに含まれる', () => {
    const snap = engine.getSnapshot();
    expect(snap.next.length).toBeGreaterThan(0);
    const hasGhost = snap.grid.some((row) => row.some((c) => c.type === 'ghost'));
    expect(hasGhost).toBe(true);
  });

  it('hardDrop でスコアが増え、次のピースが出る', () => {
    const before = engine.getScore();
    engine.hardDrop();
    expect(engine.getScore()).toBeGreaterThan(before);
    expect(engine.getSnapshot().phase).toBe('playing');
  });

  it('既に埋まった行は次のロックで消去される', () => {
    const board = engine.getBoard();
    for (let x = 0; x < board.width; x++) {
      board.setGarbage(x, TOTAL_HEIGHT - 1);
    }
    expect(engine.getLines()).toBe(0);
    engine.hardDrop(); // ロックで full ライン検出 → 消去アニメへ
    engine.tick(TIMING.lineClearDelay + 1); // アニメ完了
    expect(engine.getLines()).toBe(1);
  });

  it('hold は最初の使用で保留、2 回目で交換される', () => {
    expect(engine.getSnapshot().hold).toBeNull();
    engine.hold();
    expect(engine.getSnapshot().hold).not.toBeNull();
    // 同じ落下中は再ホールド不可。
    const held = engine.getSnapshot().hold;
    engine.hold();
    expect(engine.getSnapshot().hold).toEqual(held);
  });

  it('togglePause で playing と paused を行き来する', () => {
    engine.togglePause();
    expect(engine.getSnapshot().phase).toBe('paused');
    engine.togglePause();
    expect(engine.getSnapshot().phase).toBe('playing');
  });

  it('paused 中は tick で落下しない', () => {
    engine.togglePause();
    const before = engine.getSnapshot();
    engine.tick(5000);
    expect(engine.getSnapshot()).toEqual(before);
  });

  it('スポーン位置が埋まっているとゲームオーバー', () => {
    const fresh = makeEngine();
    const board = fresh.getBoard();
    for (let y = TOTAL_HEIGHT - 25; y < TOTAL_HEIGHT; y++) {
      for (let x = 0; x < board.width; x++) board.setGarbage(x, y);
    }
    fresh.start();
    expect(fresh.isGameOver()).toBe(true);
    expect(fresh.getSnapshot().phase).toBe('gameover');
  });

  it('おじゃまキューがスナップショットに反映される', () => {
    engine.queueGarbage(3);
    expect(engine.getSnapshot().garbageQueue).toBe(3);
  });

  it('同じシードでハードドロップを繰り返すと決定的', () => {
    const a = new TetrisEngine({ rng: mulberry32(123) });
    const b = new TetrisEngine({ rng: mulberry32(123) });
    a.start();
    b.start();
    for (let i = 0; i < 20; i++) {
      a.hardDrop();
      a.tick(TIMING.lineClearDelay + 1);
      b.hardDrop();
      b.tick(TIMING.lineClearDelay + 1);
    }
    expect(a.getScore()).toBe(b.getScore());
    expect(a.getLines()).toBe(b.getLines());
  });
});
