import type { CellId } from '../shared/snapshot';

/**
 * UI テーマ（背景・枠・文字など）は本家（モダンガイドライン）相当で固定。
 * スキンでは変更しない。
 */
export type BackgroundEffect = 'none' | 'gradient' | 'particles' | 'scanline';

export interface Theme {
  name: string;
  background: string;
  panel: string;
  grid: string;
  text: string;
  accent: string;
  accent2: string;
  ghostAlpha: number;
  /** 背景演出（プリセットで一変）。 */
  backgroundEffect: BackgroundEffect;
  /** UI フォント（プリセットで切替）。 */
  fontFamily: string;
}

const DEFAULT_FONT =
  "'Segoe UI', system-ui, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', Meiryo, sans-serif";

export const UI_THEME: Theme = {
  name: 'guideline',
  background: '#0d1117',
  panel: '#161b22',
  grid: '#21262d',
  text: '#e6edf3',
  accent: '#58a6ff',
  accent2: '#a855f7',
  ghostAlpha: 0.28,
  backgroundEffect: 'gradient',
  fontFamily: DEFAULT_FONT,
};

let activeTheme: Theme = UI_THEME;

/** UI スタイル（プリセット）を切り替える。 */
export function setUiStyle(theme: Theme): void {
  activeTheme = theme;
  applyCssVars(theme);
}

/** UI テーマの色/フォントを CSS カスタムプロパティとして DOM に注入（全画面が一変）。 */
export function applyCssVars(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement.style;
  r.setProperty('--bg', theme.background);
  r.setProperty('--panel', theme.panel);
  r.setProperty('--text', theme.text);
  r.setProperty('--accent', theme.accent);
  r.setProperty('--accent2', theme.accent2);
  r.setProperty('--border', 'rgba(255,255,255,0.14)');
  r.setProperty('--font', theme.fontFamily);
}

/** ミノ（ブロック）の見た目だけを定義するスキン。UI は変えない。 */
export interface MinoSkin {
  id: string;
  name: string;
  /** 論理 ID -> 実際の色。 */
  colors: Record<CellId, string>;
  /** ブロックの描画スタイル。 */
  style?: 'gradient' | 'flat' | 'outline';
}

/** 既定（本家相当のガイドライン配色）。 */
export const GUIDELINE_COLORS: Record<CellId, string> = {
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
};

export const DEFAULT_SKIN: MinoSkin = {
  id: 'guideline',
  name: 'ガイドライン',
  colors: GUIDELINE_COLORS,
  style: 'gradient',
};

let activeSkin: MinoSkin = DEFAULT_SKIN;

/** 現在の UI テーマを返す。 */
export function getTheme(): Theme {
  return activeTheme;
}

/** 現在のミノスキンを返す。 */
export function getSkin(): MinoSkin {
  return activeSkin;
}

/** ミノスキンを切り替える（UI は不変）。 */
export function setSkin(skin: MinoSkin): void {
  activeSkin = skin;
}

/** 論理 ID をアクティブなミノスキンの色へ変換する。 */
export function colorOf(id: CellId): string {
  return activeSkin.colors[id] ?? activeSkin.colors.empty ?? '#888888';
}
