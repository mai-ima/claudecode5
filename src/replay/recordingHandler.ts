import type { TetrisInputHandler } from '../input/InputController';
import type { TetrisEngine } from '../modes/tetris/TetrisEngine';
import type { ReplayRecorder } from './Recorder';

/**
 * 入力ハンドラをラップし、各操作をリプレイに記録しつつエンジンへ委譲する。
 * 人間プレイの 1P テトリスで InputController の handler として使う。
 */
export function wrapForRecording(
  engine: TetrisEngine,
  recorder: ReplayRecorder,
): TetrisInputHandler {
  return {
    moveLeft: () => {
      recorder.record('moveLeft');
      engine.moveLeft();
    },
    moveRight: () => {
      recorder.record('moveRight');
      engine.moveRight();
    },
    rotateCW: () => {
      recorder.record('rotateCW');
      engine.rotateCW();
    },
    rotateCCW: () => {
      recorder.record('rotateCCW');
      engine.rotateCCW();
    },
    rotate180: () => {
      recorder.record('rotate180');
      engine.rotate180();
    },
    hold: () => {
      recorder.record('hold');
      engine.hold();
    },
    hardDrop: () => {
      recorder.record('hardDrop');
      engine.hardDrop();
    },
    setSoftDrop: (active: boolean) => {
      recorder.record(active ? 'softOn' : 'softOff');
      engine.setSoftDrop(active);
    },
    togglePause: () => {
      // ポーズはリプレイに記録しない（再生に影響させない）。
      engine.togglePause();
    },
  };
}
