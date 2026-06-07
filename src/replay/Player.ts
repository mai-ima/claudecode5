import { STEP_MS } from '../config/constants';
import { mulberry32 } from '../shared/rng';
import { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { TetrisEngineOptions } from '../modes/tetris/TetrisEngine';
import type { RecordedAction, Replay } from './Recorder';

function applyAction(engine: TetrisEngine, action: RecordedAction): void {
  switch (action) {
    case 'moveLeft':
      engine.moveLeft();
      break;
    case 'moveRight':
      engine.moveRight();
      break;
    case 'rotateCW':
      engine.rotateCW();
      break;
    case 'rotateCCW':
      engine.rotateCCW();
      break;
    case 'rotate180':
      engine.rotate180();
      break;
    case 'hold':
      engine.hold();
      break;
    case 'hardDrop':
      engine.hardDrop();
      break;
    case 'softOn':
      engine.setSoftDrop(true);
      break;
    case 'softOff':
      engine.setSoftDrop(false);
      break;
  }
}

/**
 * リプレイを固定タイムステップで再生し、最終状態のエンジンを返す。
 * 決定的なので同じ Replay からは常に同じ結果になる（観戦/検証に使用）。
 */
export function playReplay(replay: Replay, options: Omit<TetrisEngineOptions, 'rng'> = {}): TetrisEngine {
  const engine = new TetrisEngine({ ...options, rng: mulberry32(replay.seed) });
  engine.start();

  const endT = (replay.events.at(-1)?.t ?? 0) + 2000;
  let t = 0;
  let idx = 0;
  while (t <= endT && !engine.isGameOver()) {
    while (idx < replay.events.length && (replay.events[idx] as { t: number }).t <= t) {
      applyAction(engine, (replay.events[idx] as { action: RecordedAction }).action);
      idx++;
    }
    engine.tick(STEP_MS);
    t += STEP_MS;
  }
  return engine;
}
