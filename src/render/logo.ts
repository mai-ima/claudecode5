/**
 * オリジナルのワードマーク（商標非使用）。currentColor で着色されるため、
 * プリセットのアクセント色に追従する。絵文字は使わず SVG で描く。
 */
export const LOGO_SVG = `
<svg viewBox="0 0 360 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TETRIS">
  <g fill="currentColor">
    <rect x="0" y="8" width="18" height="18" rx="3" opacity="0.95"/>
    <rect x="20" y="8" width="18" height="18" rx="3" opacity="0.7"/>
    <rect x="20" y="28" width="18" height="18" rx="3" opacity="0.45"/>
    <rect x="40" y="28" width="18" height="18" rx="3" opacity="0.25"/>
  </g>
  <text x="76" y="64" font-family="'Segoe UI', system-ui, sans-serif" font-size="56"
        font-weight="800" letter-spacing="2" fill="currentColor">TETRIS</text>
</svg>`;
