import type { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { PuyoEngine } from '../modes/puyo/PuyoEngine';
import type { DummyEngine } from './DummyEngine';
import type { Combatant } from './VersusController';

/** テトリスエンジンを対戦の席に適合させる。攻撃量はエンジンが算出・相殺済み。 */
export function tetrisCombatant(engine: TetrisEngine): Combatant {
  return {
    view: engine,
    queueGarbage: (amount) => engine.queueGarbage(amount),
    onAttack: (cb) => {
      engine.events.on('attack', ({ amount }) => {
        if (amount > 0) cb(amount);
      });
    },
  };
}

/** ぷよエンジンを対戦の席に適合させる。 */
export function puyoCombatant(engine: PuyoEngine): Combatant {
  return {
    view: engine,
    queueGarbage: (amount) => engine.queueGarbage(amount),
    onAttack: (cb) => {
      engine.events.on('garbageSent', ({ amount }) => {
        if (amount > 0) cb(amount);
      });
    },
  };
}

/**
 * リモート相手（DummyEngine）を席に適合させる。
 * リモートの攻撃はネット受信時に直接ローカルへ配送するため、ここでは何もしない。
 */
export function dummyCombatant(dummy: DummyEngine): Combatant {
  return {
    view: dummy,
    queueGarbage: () => {},
    onAttack: () => {},
  };
}
