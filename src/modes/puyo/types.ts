/** ぷよぷよ専用のドメイン型（テトリスとは完全に独立）。 */

export type PuyoColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple';

export const PUYO_COLORS: readonly PuyoColor[] = ['red', 'green', 'blue', 'yellow', 'purple'];

/** 組ぷよの向き（child が axis に対してどこにあるか）。 */
export type PuyoOrientation = 0 | 1 | 2 | 3; // 0=上, 1=右, 2=下, 3=左

/** 操作中の組ぷよ（軸ぷよ + 子ぷよ）。 */
export interface PuyoPair {
  axisColor: PuyoColor;
  childColor: PuyoColor;
  x: number;
  y: number;
  orientation: PuyoOrientation;
}

/**
 * ぷよぷよ専用の操作インテント。
 * QuickTurn（180 度回転）はぷよ固有。Hold / HardDrop は持たない。
 */
export type PuyoIntent =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'quickTurn';

/** child の相対オフセット（向きごと, y は下方向が正）。 */
export function childOffset(orientation: PuyoOrientation): { dx: number; dy: number } {
  switch (orientation) {
    case 0:
      return { dx: 0, dy: -1 };
    case 1:
      return { dx: 1, dy: 0 };
    case 2:
      return { dx: 0, dy: 1 };
    case 3:
      return { dx: -1, dy: 0 };
  }
}
