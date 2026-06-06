/** ゲーム内表示テキストの日本語化。 */

/** エンジンが生成する消去ラベル（英語）を日本語表示に変換する。 */
export function localizeClearLabel(label: string): string {
  let s = label;
  s = s.replace('T-Spin Mini', 'Tスピンミニ');
  s = s.replace('T-Spin', 'Tスピン');
  s = s.replace('Tetris', 'テトリス');
  s = s.replace(' Single', ' シングル');
  s = s.replace(' Double', ' ダブル');
  s = s.replace(' Triple', ' トリプル');
  const lines = /^(\d) Lines?$/.exec(s);
  if (lines) s = `${lines[1]}ライン`;
  return s;
}
