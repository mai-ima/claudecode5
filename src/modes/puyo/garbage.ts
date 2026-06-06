import type { Rng } from '../../shared/rng';
import type { PuyoBoard } from './PuyoBoard';

/**
 * おじゃまぷよを盤面に降らせる。各列の最上段の空きへ均等に配置し、落下させる。
 */
export function dropGarbage(board: PuyoBoard, count: number, rng: Rng): void {
  if (count <= 0) return;
  // 列をシャッフルした順で 1 個ずつ積む（均等に近い分布）。
  let remaining = count;
  while (remaining > 0) {
    const columns = shuffledColumns(board.width, rng);
    for (const x of columns) {
      if (remaining <= 0) break;
      // その列の最上段の空きへ置く（実際には gravity で底へ落ちる）。
      for (let y = 0; y < board.height; y++) {
        if (board.isEmpty(x, y)) {
          board.setGarbage(x, y);
          remaining--;
          break;
        }
      }
    }
    // 全列が満杯なら打ち切り。
    if (!hasEmpty(board)) break;
  }
  board.applyGravity();
}

function shuffledColumns(width: number, rng: Rng): number[] {
  const cols = Array.from({ length: width }, (_, i) => i);
  for (let i = cols.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const a = cols[i] as number;
    cols[i] = cols[j] as number;
    cols[j] = a;
  }
  return cols;
}

function hasEmpty(board: PuyoBoard): boolean {
  for (let x = 0; x < board.width; x++) {
    if (board.isEmpty(x, 0)) return true;
  }
  return false;
}
