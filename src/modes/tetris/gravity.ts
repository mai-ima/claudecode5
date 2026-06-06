import { framesPerCell, SOFT_DROP_GRAVITY_FACTOR } from '../../config/scoring';

/** レベルとソフトドロップ状態から、1 セル落下に要する時間（ms）を求める。 */
export function gravityIntervalMs(level: number, softDrop: boolean): number {
  const frames = framesPerCell(level);
  const ms = frames * (1000 / 60);
  return softDrop ? Math.max(1, ms / SOFT_DROP_GRAVITY_FACTOR) : ms;
}
