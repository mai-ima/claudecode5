/** キーボード操作のデフォルト割り当てと永続化。 */

/** 操作アクション（テトリス）。 */
export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'rotate180'
  | 'hardDrop'
  | 'hold'
  | 'pause';

/** KeyboardEvent.code -> アクション。 */
export type KeyMap = Record<string, InputAction>;

export const DEFAULT_KEYMAP_P1: KeyMap = {
  ArrowLeft: 'moveLeft',
  ArrowRight: 'moveRight',
  ArrowDown: 'softDrop',
  ArrowUp: 'rotateCW',
  KeyX: 'rotateCW',
  KeyZ: 'rotateCCW',
  ControlLeft: 'rotateCCW',
  KeyA: 'rotate180',
  Space: 'hardDrop',
  KeyC: 'hold',
  ShiftLeft: 'hold',
  KeyP: 'pause',
  Escape: 'pause',
};

/** 2P 用（ローカル対戦）。 */
export const DEFAULT_KEYMAP_P2: KeyMap = {
  KeyJ: 'moveLeft',
  KeyL: 'moveRight',
  KeyK: 'softDrop',
  KeyI: 'rotateCW',
  KeyU: 'rotateCCW',
  KeyO: 'rotate180',
  KeyG: 'hardDrop',
  KeyH: 'hold',
};

const STORAGE_KEY = 'tetris.keymap.p1';

export function loadKeymap(): KeyMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_KEYMAP_P1, ...(JSON.parse(raw) as KeyMap) };
  } catch {
    // localStorage 不可環境では既定値。
  }
  return { ...DEFAULT_KEYMAP_P1 };
}

export function saveKeymap(map: KeyMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 保存不可は無視。
  }
}
