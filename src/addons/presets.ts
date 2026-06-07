import { GUIDELINE_COLORS } from '../render/theme';
import type { MinoSkin, Theme } from '../render/theme';
import type { CellId } from '../shared/snapshot';
import type { Addon } from './types';

function colors(over: Partial<Record<CellId, string>>): Record<CellId, string> {
  return { ...GUIDELINE_COLORS, ...over };
}

// ---- UI スタイル ----
const STYLE_PUYOTETRO: Theme = {
  name: 'puyotetro',
  background: '#140a26',
  panel: '#241338',
  grid: '#33204f',
  text: '#fdf2ff',
  accent: '#ff4fa3',
  accent2: '#4fe0ff',
  ghostAlpha: 0.3,
  backgroundEffect: 'particles',
};

const STYLE_GUIDELINE: Theme = {
  name: 'guideline',
  background: '#0d1117',
  panel: '#161b22',
  grid: '#21262d',
  text: '#e6edf3',
  accent: '#58a6ff',
  accent2: '#a855f7',
  ghostAlpha: 0.28,
  backgroundEffect: 'gradient',
};

const STYLE_TETRIO: Theme = {
  name: 'tetrio',
  background: '#0b0d14',
  panel: '#151823',
  grid: '#1f2433',
  text: '#eaf0ff',
  accent: '#4cc2ff',
  accent2: '#9b8cff',
  ghostAlpha: 0.22,
  backgroundEffect: 'none',
};

const STYLE_NES: Theme = {
  name: 'classic-nes',
  background: '#000000',
  panel: '#0a0a0a',
  grid: '#171717',
  text: '#e8e8e8',
  accent: '#00a800',
  accent2: '#fc9838',
  ghostAlpha: 0.18,
  backgroundEffect: 'scanline',
};

// ---- ミノスキン ----
const SKIN_VIVID: MinoSkin = { id: 'vivid', name: 'ビビッド', colors: GUIDELINE_COLORS, style: 'gradient' };
const SKIN_FLAT: MinoSkin = { id: 'tetrio-flat', name: 'フラット', colors: GUIDELINE_COLORS, style: 'flat' };
const SKIN_NES: MinoSkin = {
  id: 'nes',
  name: 'NES',
  style: 'flat',
  colors: colors({
    I: '#3cbcfc',
    O: '#f8d800',
    T: '#b800e8',
    S: '#58d854',
    Z: '#f83800',
    J: '#0058f8',
    L: '#f87858',
    garbage: '#7c7c7c',
  }),
};

/** 既定アドオン群（本家プリセット）。 */
export const PRESET_ADDONS: Addon[] = [
  {
    id: 'puyotetro',
    name: 'ぷよテト風',
    description: 'カラフルでにぎやかな基準スタイル（テトリス＆ぷよ）。',
    uiStyle: STYLE_PUYOTETRO,
    minoSkin: SKIN_VIVID,
    tetrisRules: { rotationSystem: 'srs', allow180: true, spinMode: 'tspin' },
  },
  {
    id: 'guideline',
    name: '公式ガイドライン風',
    description: 'クリーンで標準的なガイドライン準拠。',
    uiStyle: STYLE_GUIDELINE,
    minoSkin: SKIN_VIVID,
    tetrisRules: {},
  },
  {
    id: 'tetrio',
    name: 'TETR.IO風（競技）',
    description: 'ダークで高速な競技向け。DAS短め・ARR0・ソフト40G。',
    uiStyle: STYLE_TETRIO,
    minoSkin: SKIN_FLAT,
    tetrisRules: {
      handling: { das: 100, arr: 0 },
      softDrop40G: true,
      allow180: true,
      spinMode: 'allspin',
      nextCount: 5,
    },
  },
  {
    id: 'classic-nes',
    name: 'クラシック(NES/GB)風',
    description: 'レトロ。壁蹴り無し・180無し・スピン無し・ネクスト1。',
    uiStyle: STYLE_NES,
    minoSkin: SKIN_NES,
    tetrisRules: {
      rotationSystem: 'classic',
      allow180: false,
      spinMode: 'none',
      nextCount: 1,
    },
  },
];
