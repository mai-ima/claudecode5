import { describe, expect, it } from 'vitest';
import { TOTAL_HEIGHT } from '../../config/constants';
import { mulberry32 } from '../../shared/rng';
import { TetrisEngine } from './TetrisEngine';

function fillRows(engine: TetrisEngine, n: number): void {
  const b = engine.getBoard();
  for (let y = TOTAL_HEIGHT - n; y < TOTAL_HEIGHT; y++) {
    for (let x = 0; x < b.width; x++) b.setGarbage(x, y);
  }
}

describe('ガベージ/攻撃', () => {
  it('2ライン消去で攻撃を送る（lines[2]=1）', () => {
    const e = new TetrisEngine({ rng: mulberry32(1) });
    e.start();
    fillRows(e, 2);
    let atk = 0;
    e.events.on('attack', ({ amount }) => (atk += amount));
    e.hardDrop();
    expect(atk).toBe(1);
  });

  it('受けおじゃまは送りで相殺される（カウンター）', () => {
    const e = new TetrisEngine({ rng: mulberry32(1) });
    e.start();
    fillRows(e, 2);
    e.queueGarbage(3);
    let atk = 0;
    e.events.on('attack', ({ amount }) => (atk += amount));
    e.hardDrop();
    expect(atk).toBe(0); // 攻撃1が受け3のうち1を相殺、余剰0
    expect(e.getSnapshot().garbageQueue).toBe(2);
  });

  it('消去しないロックで受けおじゃまが盤面に投下される', () => {
    const e = new TetrisEngine({ rng: mulberry32(2) });
    e.start();
    e.queueGarbage(4);
    expect(e.getSnapshot().garbageQueue).toBe(4);
    e.hardDrop(); // 消去なし → 投下
    expect(e.getSnapshot().garbageQueue).toBe(0);
  });
});
