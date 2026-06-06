import { TIMING } from '../config/constants';
import type { InputAction, KeyMap } from '../config/controls';

/**
 * 入力ハンドラ。テトリスエンジンのコマンドと同じ語彙を持つ。
 * 罠対策(1): 入力はモードごとに型を分ける（これはテトリス用）。
 */
export interface TetrisInputHandler {
  moveLeft(): void;
  moveRight(): void;
  rotateCW(): void;
  rotateCCW(): void;
  rotate180(): void;
  hardDrop(): void;
  hold(): void;
  togglePause(): void;
  setSoftDrop(active: boolean): void;
}

/**
 * キーボード入力を検知し、DAS/ARR を処理してハンドラを駆動する。
 * 生のキー検知に徹し、各エンジン特有の操作性（横移動の自動連射等）をここで作る。
 */
export class InputController {
  private pressed = new Set<string>();
  private dasDir: -1 | 0 | 1 = 0;
  private dasTimer = 0;
  private arrTimer = 0;
  private dasCharged = false;
  private attached = false;

  constructor(
    private readonly handler: TetrisInputHandler,
    private keymap: KeyMap,
  ) {}

  setKeymap(map: KeyMap): void {
    this.keymap = map;
  }

  attach(target: Window | HTMLElement = window): void {
    if (this.attached) return;
    this.attached = true;
    target.addEventListener('keydown', this.onKeyDown as EventListener);
    target.addEventListener('keyup', this.onKeyUp as EventListener);
    this.target = target;
  }

  detach(): void {
    if (!this.attached || !this.target) return;
    this.target.removeEventListener('keydown', this.onKeyDown as EventListener);
    this.target.removeEventListener('keyup', this.onKeyUp as EventListener);
    this.attached = false;
    this.pressed.clear();
    this.dasDir = 0;
  }

  private target: Window | HTMLElement | null = null;

  /** 毎ステップ呼ばれ、横移動の自動連射を処理する。 */
  update(dt: number): void {
    if (this.dasDir === 0) return;
    this.dasTimer += dt;
    if (!this.dasCharged) {
      if (this.dasTimer >= TIMING.das) {
        this.dasCharged = true;
        this.arrTimer = 0;
        this.moveByDir();
      }
      return;
    }
    this.arrTimer += dt;
    while (this.arrTimer >= TIMING.arr) {
      this.arrTimer -= TIMING.arr;
      this.moveByDir();
    }
  }

  private moveByDir(): void {
    if (this.dasDir === -1) this.handler.moveLeft();
    else if (this.dasDir === 1) this.handler.moveRight();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const action = this.keymap[e.code];
    if (!action) return;
    e.preventDefault();
    if (this.pressed.has(e.code)) return; // リピートは自前で制御。
    this.pressed.add(e.code);
    this.dispatchDown(action);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const action = this.keymap[e.code];
    if (!action) return;
    this.pressed.delete(e.code);
    this.dispatchUp(action);
  };

  private dispatchDown(action: InputAction): void {
    switch (action) {
      case 'moveLeft':
        this.startDas(-1);
        this.handler.moveLeft();
        break;
      case 'moveRight':
        this.startDas(1);
        this.handler.moveRight();
        break;
      case 'softDrop':
        this.handler.setSoftDrop(true);
        break;
      case 'rotateCW':
        this.handler.rotateCW();
        break;
      case 'rotateCCW':
        this.handler.rotateCCW();
        break;
      case 'rotate180':
        this.handler.rotate180();
        break;
      case 'hardDrop':
        this.handler.hardDrop();
        break;
      case 'hold':
        this.handler.hold();
        break;
      case 'pause':
        this.handler.togglePause();
        break;
    }
  }

  private dispatchUp(action: InputAction): void {
    if (action === 'softDrop') {
      this.handler.setSoftDrop(false);
    } else if (action === 'moveLeft' && this.dasDir === -1) {
      this.stopDas();
    } else if (action === 'moveRight' && this.dasDir === 1) {
      this.stopDas();
    }
  }

  private startDas(dir: -1 | 1): void {
    this.dasDir = dir;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.dasCharged = false;
  }

  private stopDas(): void {
    this.dasDir = 0;
    this.dasCharged = false;
  }
}
