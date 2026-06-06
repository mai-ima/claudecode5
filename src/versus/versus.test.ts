import { describe, expect, it } from 'vitest';
import type { EngineView } from '../shared/engineView';
import { DummyEngine } from './DummyEngine';
import { VersusController } from './VersusController';
import type { Combatant } from './VersusController';
import { tetrisAttack } from './attack';

describe('tetrisAttack', () => {
  it('通常消去の基本値', () => {
    expect(tetrisAttack({ lines: 1, tspin: 'none', combo: 0, backToBack: false })).toBe(0);
    expect(tetrisAttack({ lines: 2, tspin: 'none', combo: 0, backToBack: false })).toBe(1);
    expect(tetrisAttack({ lines: 4, tspin: 'none', combo: 0, backToBack: false })).toBe(4);
  });

  it('T-Spin は大きい', () => {
    expect(tetrisAttack({ lines: 2, tspin: 'full', combo: 0, backToBack: false })).toBe(4);
  });

  it('B2B と Combo で加算', () => {
    expect(tetrisAttack({ lines: 4, tspin: 'none', combo: 0, backToBack: true })).toBe(5);
    expect(tetrisAttack({ lines: 2, tspin: 'none', combo: 5, backToBack: false })).toBeGreaterThan(1);
  });
});

type FakeCombatant = Combatant & { received: number; over: boolean; fire: (n: number) => void };

function fakeCombatant(): FakeCombatant {
  let attackCb: (n: number) => void = () => {};
  const c: FakeCombatant = {
    received: 0,
    over: false,
    fire: (n: number) => attackCb(n),
    view: {
      getSnapshot: () => DummyEngine.blankSnapshot(10, 20),
      isGameOver: () => c.over,
    } as EngineView,
    queueGarbage: (amount: number) => {
      c.received += amount;
    },
    onAttack: (cb) => {
      attackCb = cb;
    },
  };
  return c;
}

describe('VersusController', () => {
  it('攻撃が相手のおじゃまになる', () => {
    const a = fakeCombatant();
    const b = fakeCombatant();
    new VersusController(a, b);
    a.fire(3);
    expect(b.received).toBe(3);
    b.fire(5);
    expect(a.received).toBe(5);
  });

  it('片方がゲームオーバーで相手が勝者', () => {
    const a = fakeCombatant();
    const b = fakeCombatant();
    const vs = new VersusController(a, b);
    expect(vs.update()).toBeNull();
    b.over = true;
    expect(vs.update()).toBe(0);
  });
});

describe('DummyEngine', () => {
  it('受信した Snapshot を返す', () => {
    const dummy = new DummyEngine(10, 20);
    const snap = DummyEngine.blankSnapshot(10, 20);
    snap.hud.score = 999;
    dummy.setSnapshot(snap);
    expect(dummy.getSnapshot().hud.score).toBe(999);
  });

  it('gameover Snapshot で isGameOver になる', () => {
    const dummy = new DummyEngine();
    const snap = DummyEngine.blankSnapshot(10, 20);
    snap.phase = 'gameover';
    dummy.setSnapshot(snap);
    expect(dummy.isGameOver()).toBe(true);
  });
});
