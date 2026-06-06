import { DEFAULT_THEME } from '../render/theme';
import type { Theme } from '../render/theme';
import type { Plugin, Skin } from './api';

const neonTheme: Theme = {
  ...DEFAULT_THEME,
  name: 'neon',
  background: '#04000a',
  panel: '#140033',
  grid: '#2a0a4a',
  accent: '#ff2bd6',
  colors: {
    ...DEFAULT_THEME.colors,
    I: '#00fff0',
    O: '#fff700',
    T: '#ff2bd6',
    S: '#39ff14',
    Z: '#ff073a',
    J: '#1b6dff',
    L: '#ff9f1c',
  },
};

const mochiTheme: Theme = {
  ...DEFAULT_THEME,
  name: 'mochi',
  background: '#fdf6ec',
  panel: '#fae3c6',
  grid: '#e8d3b5',
  text: '#5b4636',
  accent: '#e08e79',
  ghostAlpha: 0.35,
  colors: {
    ...DEFAULT_THEME.colors,
    empty: '#fdf6ec',
    I: '#7fd4c1',
    O: '#f4d35e',
    T: '#cda1e0',
    S: '#a3d977',
    Z: '#ef8a8a',
    J: '#8aa8e0',
    L: '#f0a868',
  },
};

const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', price: 0, theme: DEFAULT_THEME },
  { id: 'neon', name: 'Neon', price: 500, theme: neonTheme },
  { id: 'mochi', name: 'Mochi', price: 800, theme: mochiTheme },
];

/** 既定のスキンプラグイン。 */
export const skinPlugin: Plugin = {
  id: 'builtin-skins',
  name: 'Built-in Skins',
  skins: SKINS,
};
