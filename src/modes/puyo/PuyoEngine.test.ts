import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { PuyoEngine } from './PuyoEngine';

describe('PuyoEngine', () => {
  it('start でアクティブな組ぷよが出る', () => {
    const e = new PuyoEngine({ rng: mulberry32(1) });
    e.start();
    const snap = e.getSnapshot();
    expect(snap.phase).toBe('playing');
    const hasPuyo = snap.grid.some((row) => row.some((c) => c.type === 'puyo'));
    expect(hasPuyo).toBe(true);
    expect(snap.hold).toBeNull(); // ぷよに Hold は無い
  });

  it('hardDrop でロックし、連鎖解決後に次が出る', () => {
    const e = new PuyoEngine({ rng: mulberry32(5) });
    e.start();
    e.hardDrop();
    // 解決フェーズを進める（連鎖が無ければ 1 ビートで完了）。
    e.tick(300);
    expect(e.isGameOver()).toBe(false);
    expect(e.getSnapshot().phase).toBe('playing');
  });

  it('スポーン位置が埋まっているとゲームオーバー', () => {
    const e = new PuyoEngine({ rng: mulberry32(2) });
    const board = e.getBoard();
    board.setGarbage(2, 1);
    board.setGarbage(2, 2);
    e.start();
    expect(e.isGameOver()).toBe(true);
  });

  it('左右移動できる', () => {
    const e = new PuyoEngine({ rng: mulberry32(3) });
    e.start();
    const before = e.getSnapshot();
    e.moveLeft();
    const after = e.getSnapshot();
    // 盤面表現が変化する（位置が動く）。
    expect(JSON.stringify(after.grid)).not.toEqual(JSON.stringify(before.grid));
  });

  it('おじゃまキューがスナップショットに反映される', () => {
    const e = new PuyoEngine({ rng: mulberry32(4) });
    e.start();
    e.queueGarbage(6);
    expect(e.getSnapshot().garbageQueue).toBe(6);
  });
});
