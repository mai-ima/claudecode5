import type { PuyoColor } from './types';

/** ぷよぷよ盤面の寸法。 */
export const PUYO_WIDTH = 6;
export const PUYO_VISIBLE_HEIGHT = 12;
export const PUYO_BUFFER = 2;
export const PUYO_TOTAL_HEIGHT = PUYO_VISIBLE_HEIGHT + PUYO_BUFFER;

const COLOR_CODE: Record<PuyoColor, number> = {
  red: 1,
  green: 2,
  blue: 3,
  yellow: 4,
  purple: 5,
};
const GARBAGE_CODE = 6;
const CODE_COLOR: Record<number, PuyoColor> = {
  1: 'red',
  2: 'green',
  3: 'blue',
  4: 'yellow',
  5: 'purple',
};

export type PuyoCellId = PuyoColor | 'garbage' | null;

/**
 * ぷよ盤面。テトリスの盤面とは別物（寸法・セルの意味が異なる）。
 * 0=空, 1..5=色, 6=おじゃま。
 */
export class PuyoBoard {
  readonly width = PUYO_WIDTH;
  readonly height = PUYO_TOTAL_HEIGHT;
  private cells: Uint8Array;

  constructor(cells?: Uint8Array) {
    this.cells = cells ?? new Uint8Array(PUYO_WIDTH * PUYO_TOTAL_HEIGHT);
  }

  clone(): PuyoBoard {
    return new PuyoBoard(this.cells.slice());
  }

  private index(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isEmpty(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return (this.cells[this.index(x, y)] ?? 0) === 0;
  }

  setColor(x: number, y: number, color: PuyoColor): void {
    if (!this.inBounds(x, y)) return;
    this.cells[this.index(x, y)] = COLOR_CODE[color];
  }

  setGarbage(x: number, y: number): void {
    if (!this.inBounds(x, y)) return;
    this.cells[this.index(x, y)] = GARBAGE_CODE;
  }

  clearCell(x: number, y: number): void {
    if (!this.inBounds(x, y)) return;
    this.cells[this.index(x, y)] = 0;
  }

  raw(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0;
    return this.cells[this.index(x, y)] ?? 0;
  }

  idAt(x: number, y: number): PuyoCellId {
    const v = this.raw(x, y);
    if (v === 0) return null;
    if (v === GARBAGE_CODE) return 'garbage';
    return CODE_COLOR[v] ?? null;
  }

  isGarbage(x: number, y: number): boolean {
    return this.raw(x, y) === GARBAGE_CODE;
  }

  /** 盤面全体が空か（全消し判定）。 */
  isAllEmpty(): boolean {
    return this.cells.every((c) => c === 0);
  }

  /** 各列でぷよを底へ落とす（ちぎれ・連鎖後の落下）。 */
  applyGravity(): boolean {
    let moved = false;
    for (let x = 0; x < this.width; x++) {
      let writeY = this.height - 1;
      for (let y = this.height - 1; y >= 0; y--) {
        const v = this.cells[this.index(x, y)] ?? 0;
        if (v !== 0) {
          if (writeY !== y) {
            this.cells[this.index(x, writeY)] = v;
            this.cells[this.index(x, y)] = 0;
            moved = true;
          }
          writeY--;
        }
      }
    }
    return moved;
  }
}
