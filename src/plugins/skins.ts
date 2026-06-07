import { GUIDELINE_COLORS } from '../render/theme';
import type { CellId } from '../shared/snapshot';
import type { Plugin, Skin } from './api';

/** ガイドライン配色をベースに、テトロミノ色だけ差し替えるヘルパ。 */
function withTetromino(colors: Partial<Record<CellId, string>>): Record<CellId, string> {
  return { ...GUIDELINE_COLORS, ...colors };
}

const SKINS: Skin[] = [
  // 本家相当（既定・無料）。
  { id: 'guideline', name: 'ガイドライン', price: 0, style: 'gradient', colors: GUIDELINE_COLORS },

  // モノクロ（フラット）。
  {
    id: 'mono',
    name: 'モノクロ',
    price: 300,
    style: 'flat',
    colors: withTetromino({
      I: '#e5e7eb',
      O: '#cbd5e1',
      T: '#94a3b8',
      S: '#9ca3af',
      Z: '#6b7280',
      J: '#a1a1aa',
      L: '#d4d4d8',
    }),
  },

  // ゲームボーイ（緑・アウトライン）。
  {
    id: 'gameboy',
    name: 'ゲームボーイ',
    price: 400,
    style: 'outline',
    colors: withTetromino({
      I: '#9bbc0f',
      O: '#9bbc0f',
      T: '#8bac0f',
      S: '#8bac0f',
      Z: '#306230',
      J: '#306230',
      L: '#9bbc0f',
      garbage: '#0f380f',
    }),
  },

  // ネオン（アウトライン）。
  {
    id: 'neon',
    name: 'ネオン',
    price: 500,
    style: 'outline',
    colors: withTetromino({
      I: '#00fff0',
      O: '#fff700',
      T: '#ff2bd6',
      S: '#39ff14',
      Z: '#ff073a',
      J: '#1b6dff',
      L: '#ff9f1c',
    }),
  },

  // パステル（フラット）。
  {
    id: 'pastel',
    name: 'パステル',
    price: 500,
    style: 'flat',
    colors: withTetromino({
      I: '#7fd4c1',
      O: '#f4d35e',
      T: '#cda1e0',
      S: '#a3d977',
      Z: '#ef8a8a',
      J: '#8aa8e0',
      L: '#f0a868',
    }),
  },

  // サンセット（グラデ）。
  {
    id: 'sunset',
    name: 'サンセット',
    price: 700,
    style: 'gradient',
    colors: withTetromino({
      I: '#ffd166',
      O: '#ffb703',
      T: '#fb8500',
      S: '#f48c06',
      Z: '#e85d04',
      J: '#dc2f02',
      L: '#ff9e00',
    }),
  },

  // レトロ（フラット・くすんだ色）。
  {
    id: 'retro',
    name: 'レトロ',
    price: 700,
    style: 'flat',
    colors: withTetromino({
      I: '#4cc9f0',
      O: '#ffd60a',
      T: '#b5179e',
      S: '#80b918',
      Z: '#d00000',
      J: '#3a0ca3',
      L: '#f3722c',
    }),
  },
];

/** 既定のミノスキンプラグイン。 */
export const skinPlugin: Plugin = {
  id: 'builtin-skins',
  name: 'ミノスキン',
  skins: SKINS,
};
