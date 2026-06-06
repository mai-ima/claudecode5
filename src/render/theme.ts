import type { CellId } from '../shared/snapshot';

/**
 * 視覚定数の単一の置き場。論理 ID -> 実際の色への変換テーブル。
 * スキンプラグインはこの Theme を差し替えることで見た目を変える。
 */
export interface Theme {
  name: string;
  background: string;
  panel: string;
  grid: string;
  text: string;
  accent: string;
  ghostAlpha: number;
  colors: Record<CellId, string>;
}

export const DEFAULT_THEME: Theme = {
  name: 'classic',
  background: '#0d1117',
  panel: '#161b22',
  grid: '#21262d',
  text: '#e6edf3',
  accent: '#58a6ff',
  ghostAlpha: 0.28,
  colors: {
    empty: '#0d1117',
    I: '#2dd4bf',
    O: '#facc15',
    T: '#a855f7',
    S: '#22c55e',
    Z: '#ef4444',
    J: '#3b82f6',
    L: '#f97316',
    garbage: '#6b7280',
    'puyo-red': '#ef4444',
    'puyo-green': '#22c55e',
    'puyo-blue': '#3b82f6',
    'puyo-yellow': '#facc15',
    'puyo-purple': '#a855f7',
  },
};

/** 現在のテーマを保持する小さなレジストリ（スキン切替で更新）。 */
let activeTheme: Theme = DEFAULT_THEME;

export function getTheme(): Theme {
  return activeTheme;
}

export function setTheme(theme: Theme): void {
  activeTheme = theme;
}

export function colorOf(id: CellId): string {
  return activeTheme.colors[id] ?? activeTheme.colors.empty;
}
