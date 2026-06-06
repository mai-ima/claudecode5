import { BOARD_WIDTH, TOTAL_HEIGHT } from '../../config/constants';
import type { Cell, PieceType } from './types';

/**
 * テトリス専用の盤面。フラットな Uint8Array でセルを保持する。
 * 0 = 空, 1..7 = ピース種, 8 = おじゃま。
 */
const PIECE_CODE: Record<PieceType, number> = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};
const GARBAGE_CODE = 8;

const CODE_TO_PIECE: Record<number, PieceType | 'garbage'> = {
  1: 'I',
  2: 'O',
  3: 'T',
  4: 'S',
  5: 'Z',
  6: 'J',
  7: 'L',
  8: 'garbage',
};

export class TetrisBoard {
  readonly width = BOARD_WIDTH;
  readonly height = TOTAL_HEIGHT;
  private cells: Uint8Array;

  constructor(cells?: Uint8Array) {
    this.cells = cells ?? new Uint8Array(BOARD_WIDTH * TOTAL_HEIGHT);
  }

  clone(): TetrisBoard {
    return new TetrisBoard(this.cells.slice());
  }

  private index(x: number, y: number): number {
    return y * this.width + x;
  }

  /** セルの値（0=空, 1..8）。範囲外は壁として 1 を返す。 */
  at(x: number, y: number): number {
    if (x < 0 || x >= this.width || y >= this.height) return 1;
    if (y < 0) return 0;
    return this.cells[this.index(x, y)] ?? 0;
  }

  /** 指定セル群が空（衝突しない）かどうか。 */
  isEmptyAt(x: number, y: number): boolean {
    return this.at(x, y) === 0;
  }

  /** セル群が盤面/既存ブロックと衝突するか。 */
  collides(cells: Cell[]): boolean {
    return cells.some((cell) => this.at(cell.x, cell.y) !== 0);
  }

  /** ピース種でセル群を固定（破壊的）。 */
  place(cells: Cell[], type: PieceType): void {
    const code = PIECE_CODE[type];
    for (const cell of cells) {
      if (cell.y < 0 || cell.y >= this.height || cell.x < 0 || cell.x >= this.width) continue;
      this.cells[this.index(cell.x, cell.y)] = code;
    }
  }

  /** おじゃまセルを直接設定（おじゃま行生成用）。 */
  setGarbage(x: number, y: number): void {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) return;
    this.cells[this.index(x, y)] = GARBAGE_CODE;
  }

  /** セルを空にする。 */
  clear(x: number, y: number): void {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) return;
    this.cells[this.index(x, y)] = 0;
  }

  /** 1 行が完全に埋まっているか。 */
  isLineFull(y: number): boolean {
    for (let x = 0; x < this.width; x++) {
      if (this.at(x, y) === 0) return false;
    }
    return true;
  }

  /** 埋まった行を探す（上から順）。 */
  findFullLines(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < this.height; y++) {
      if (this.isLineFull(y)) rows.push(y);
    }
    return rows;
  }

  /** 指定行を消去して上を詰める。消した行数を返す。 */
  clearLines(rows: number[]): number {
    if (rows.length === 0) return 0;
    const remove = new Set(rows);
    const next = new Uint8Array(this.cells.length);
    let writeY = this.height - 1;
    for (let y = this.height - 1; y >= 0; y--) {
      if (remove.has(y)) continue;
      for (let x = 0; x < this.width; x++) {
        next[writeY * this.width + x] = this.cells[this.index(x, y)] ?? 0;
      }
      writeY--;
    }
    this.cells = next;
    return rows.length;
  }

  /** セル位置の論理 ID（描画用）。空なら null。 */
  idAt(x: number, y: number): PieceType | 'garbage' | null {
    const v = this.at(x, y);
    if (v === 0) return null;
    return CODE_TO_PIECE[v] ?? null;
  }
}
