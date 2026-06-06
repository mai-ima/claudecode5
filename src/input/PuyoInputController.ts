import { TIMING } from '../config/constants';

/** ぷよぷよ専用の入力ハンドラ（PuyoEngine のコマンドに対応）。 */
export interface PuyoInputHandler {
  moveLeft(): void;
  moveRight(): void;
  rotateCW(): void;
  rotateCCW(): void;
  quickTurn(): void;
  hardDrop(): void;
  togglePause(): void;
  setSoftDrop(active: boolean): void;
}

export type PuyoAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'quickTurn'
  | 'pause';

export type PuyoKeyMap = Record<string, PuyoAction>;

export const DEFAULT_PUYO_KEYMAP_P1: PuyoKeyMap = {
  ArrowLeft: 'moveLeft',
  ArrowRight: 'moveRight',
  ArrowDown: 'softDrop',
  ArrowUp: 'rotateCW',
  KeyX: 'rotateCW',
  KeyZ: 'rotateCCW',
  KeyA: 'quickTurn',
  Space: 'hardDrop',
  KeyP: 'pause',
  Escape: 'pause',
};

export const DEFAULT_PUYO_KEYMAP_P2: PuyoKeyMap = {
  KeyJ: 'moveLeft',
  KeyL: 'moveRight',
  KeyK: 'softDrop',
  KeyI: 'rotateCW',
  KeyU: 'rotateCCW',
  KeyO: 'quickTurn',
  KeyG: 'hardDrop',
};

/**
 * ぷよ専用入力コントローラ。横移動の DAS/ARR を持つ（テトリスとは別実装）。
 */
export class PuyoInputController {
  private pressed = new Set<string>();
  private dasDir: -1 | 0 | 1 = 0;
  private dasTimer = 0;
  private arrTimer = 0;
  private dasCharged = false;
  private attached = false;
  private target: Window | HTMLElement | null = null;

  constructor(
    private readonly handler: PuyoInputHandler,
    private readonly keymap: PuyoKeyMap,
  ) {}

  attach(target: Window | HTMLElement = window): void {
    if (this.attached) return;
    this.attached = true;
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown as EventListener);
    target.addEventListener('keyup', this.onKeyUp as EventListener);
  }

  detach(): void {
    if (!this.attached || !this.target) return;
    this.target.removeEventListener('keydown', this.onKeyDown as EventListener);
    this.target.removeEventListener('keyup', this.onKeyUp as EventListener);
    this.attached = false;
    this.pressed.clear();
    this.dasDir = 0;
  }

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
    if (this.pressed.has(e.code)) return;
    this.pressed.add(e.code);
    switch (action) {
      case 'moveLeft':
        this.dasDir = -1;
        this.dasTimer = 0;
        this.dasCharged = false;
        this.handler.moveLeft();
        break;
      case 'moveRight':
        this.dasDir = 1;
        this.dasTimer = 0;
        this.dasCharged = false;
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
      case 'quickTurn':
        this.handler.quickTurn();
        break;
      case 'hardDrop':
        this.handler.hardDrop();
        break;
      case 'pause':
        this.handler.togglePause();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const action = this.keymap[e.code];
    if (!action) return;
    this.pressed.delete(e.code);
    if (action === 'softDrop') this.handler.setSoftDrop(false);
    else if (action === 'moveLeft' && this.dasDir === -1) this.dasDir = 0;
    else if (action === 'moveRight' && this.dasDir === 1) this.dasDir = 0;
  };
}
