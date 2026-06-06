import { describe, expect, it } from 'vitest';
import { BOARD_WIDTH, TOTAL_HEIGHT } from '../../config/constants';
import { TetrisBoard } from './TetrisBoard';

describe('TetrisBoard', () => {
  it('初期状態は全セル空', () => {
    const board = new TetrisBoard();
    for (let y = 0; y < TOTAL_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        expect(board.isEmptyAt(x, y)).toBe(true);
      }
    }
  });

  it('壁・床は衝突扱い、上部は空扱い', () => {
    const board = new TetrisBoard();
    expect(board.collides([{ x: -1, y: 5 }])).toBe(true);
    expect(board.collides([{ x: BOARD_WIDTH, y: 5 }])).toBe(true);
    expect(board.collides([{ x: 0, y: TOTAL_HEIGHT }])).toBe(true);
    expect(board.collides([{ x: 0, y: -1 }])).toBe(false);
  });

  it('place で配置したセルと衝突する', () => {
    const board = new TetrisBoard();
    board.place([{ x: 4, y: 10 }], 'T');
    expect(board.collides([{ x: 4, y: 10 }])).toBe(true);
    expect(board.idAt(4, 10)).toBe('T');
  });

  it('埋まった行を検出して消去・上を詰める', () => {
    const board = new TetrisBoard();
    const y = TOTAL_HEIGHT - 1;
    for (let x = 0; x < BOARD_WIDTH; x++) board.place([{ x, y }], 'I');
    board.place([{ x: 0, y: y - 1 }], 'O');

    const full = board.findFullLines();
    expect(full).toContain(y);

    const cleared = board.clearLines(full);
    expect(cleared).toBe(1);
    // 上にあった O が 1 段落ちてくる。
    expect(board.idAt(0, y)).toBe('O');
  });

  it('複数行の同時消去', () => {
    const board = new TetrisBoard();
    const rows = [TOTAL_HEIGHT - 1, TOTAL_HEIGHT - 2];
    for (const y of rows) {
      for (let x = 0; x < BOARD_WIDTH; x++) board.place([{ x, y }], 'I');
    }
    expect(board.clearLines(board.findFullLines())).toBe(2);
    expect(board.findFullLines()).toHaveLength(0);
  });

  it('clone は独立したコピーを作る', () => {
    const board = new TetrisBoard();
    board.place([{ x: 1, y: 1 }], 'Z');
    const copy = board.clone();
    copy.place([{ x: 2, y: 2 }], 'L');
    expect(board.isEmptyAt(2, 2)).toBe(true);
    expect(copy.idAt(1, 1)).toBe('Z');
  });
});
