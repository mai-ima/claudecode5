import { DEFAULT_KEYMAP_P1, loadKeymap, saveKeymap } from '../config/controls';
import type { InputAction, KeyMap } from '../config/controls';
import type { Settings } from './Settings';

const ACTION_LABELS: Record<InputAction, string> = {
  moveLeft: '左移動',
  moveRight: '右移動',
  softDrop: 'ソフトドロップ',
  hardDrop: 'ハードドロップ',
  rotateCW: '右回転',
  rotateCCW: '左回転',
  rotate180: '180回転',
  hold: 'ホールド',
  pause: 'ポーズ',
};

/** 設定画面（表示オプション・ハンドリング・AI難易度・キー割当）。 */
export function buildOptionsScreen(
  settings: Settings,
  onChange: () => void,
  onClose: () => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'overlay-panel options';

  const title = document.createElement('h1');
  title.textContent = '設定';
  panel.appendChild(title);

  const body = document.createElement('div');
  body.className = 'options-body';
  panel.appendChild(body);

  const row = (label: string, control: HTMLElement): void => {
    const r = document.createElement('div');
    r.className = 'opt-row';
    const l = document.createElement('span');
    l.textContent = label;
    r.append(l, control);
    body.appendChild(r);
  };

  const toggle = (get: () => boolean, set: (v: boolean) => void): HTMLButtonElement => {
    const b = document.createElement('button');
    const render = (): void => {
      b.textContent = get() ? 'オン' : 'オフ';
      b.classList.toggle('on', get());
    };
    b.addEventListener('click', () => {
      set(!get());
      render();
      onChange();
    });
    render();
    return b;
  };

  const s = settings.all;

  row('サウンド', toggle(() => settings.all.soundEnabled, (v) => settings.update({ soundEnabled: v })));
  row('ゴースト', toggle(() => settings.all.ghost, (v) => settings.update({ ghost: v })));
  row('グリッド', toggle(() => settings.all.grid, (v) => settings.update({ grid: v })));

  // ネクスト数。
  const nextSel = document.createElement('select');
  for (let i = 1; i <= 6; i++) {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = String(i);
    if (i === s.nextCount) o.selected = true;
    nextSel.appendChild(o);
  }
  nextSel.addEventListener('change', () => {
    settings.update({ nextCount: Number(nextSel.value) });
    onChange();
  });
  row('ネクスト数', nextSel);

  // DAS / ARR。
  row('DAS (ms)', numberInput(s.das, 0, 500, (v) => settings.update({ das: v })));
  row('ARR (ms)', numberInput(s.arr, 0, 200, (v) => settings.update({ arr: v })));

  // AI 難易度。
  const aiSel = document.createElement('select');
  for (const [val, lab] of [
    ['easy', '弱'],
    ['normal', '普通'],
    ['hard', '強'],
  ] as const) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = lab;
    if (val === s.aiLevel) o.selected = true;
    aiSel.appendChild(o);
  }
  aiSel.addEventListener('change', () => {
    settings.update({ aiLevel: aiSel.value as typeof s.aiLevel });
    onChange();
  });
  row('AI難易度', aiSel);

  // オンライン接続先。
  row('オンライン: WS使用', toggle(() => settings.all.useWs, (v) => settings.update({ useWs: v })));
  const wsInput = document.createElement('input');
  wsInput.type = 'text';
  wsInput.value = s.wsUrl;
  wsInput.addEventListener('change', () => {
    settings.update({ wsUrl: wsInput.value });
    onChange();
  });
  row('WS URL', wsInput);

  // キー割当。
  const keyTitle = document.createElement('h2');
  keyTitle.textContent = 'キー設定';
  keyTitle.className = 'opt-subtitle';
  body.appendChild(keyTitle);

  let keymap = loadKeymap();
  const actionToCode = (): Partial<Record<InputAction, string>> => {
    const m: Partial<Record<InputAction, string>> = {};
    for (const [code, action] of Object.entries(keymap)) {
      if (!m[action]) m[action] = code;
    }
    return m;
  };

  const rebindButtons = new Map<InputAction, HTMLButtonElement>();
  const refreshKeys = (): void => {
    const map = actionToCode();
    for (const [action, btn] of rebindButtons) {
      btn.textContent = map[action] ?? '—';
    }
  };

  (Object.keys(ACTION_LABELS) as InputAction[]).forEach((action) => {
    const b = document.createElement('button');
    b.className = 'key-btn';
    b.addEventListener('click', () => {
      b.textContent = '押してください…';
      const handler = (e: KeyboardEvent): void => {
        e.preventDefault();
        // 既存の同アクション割当を削除し、新コードを割当。
        for (const code of Object.keys(keymap)) {
          if (keymap[code] === action) delete keymap[code];
        }
        keymap[e.code] = action;
        saveKeymap(keymap);
        window.removeEventListener('keydown', handler, true);
        refreshKeys();
        onChange();
      };
      window.addEventListener('keydown', handler, true);
    });
    rebindButtons.set(action, b);
    row(ACTION_LABELS[action], b);
  });
  refreshKeys();

  const reset = document.createElement('button');
  reset.textContent = 'キーを初期化';
  reset.addEventListener('click', () => {
    keymap = { ...DEFAULT_KEYMAP_P1 } as KeyMap;
    saveKeymap(keymap);
    refreshKeys();
    onChange();
  });
  body.appendChild(reset);

  const close = document.createElement('button');
  close.textContent = '閉じる';
  close.className = 'primary';
  close.addEventListener('click', onClose);
  panel.appendChild(close);

  return panel;
}

function numberInput(
  value: number,
  min: number,
  max: number,
  onSet: (v: number) => void,
): HTMLInputElement {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.min = String(min);
  inp.max = String(max);
  inp.value = String(value);
  inp.addEventListener('change', () => {
    const v = Math.max(min, Math.min(max, Number(inp.value) || 0));
    inp.value = String(v);
    onSet(v);
  });
  return inp;
}
