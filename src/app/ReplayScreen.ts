import type { Replay } from '../replay/Recorder';
import type { ReplayStore } from '../replay/ReplayStore';

const MODE_LABEL: Record<string, string> = {
  marathon: 'マラソン',
  sprint: 'スプリント',
  ultra: 'ウルトラ',
};

/** リプレイ一覧／視聴画面。 */
export function buildReplayScreen(
  store: ReplayStore,
  onPlay: (replay: Replay) => void,
  onClose: () => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'overlay-panel presets';

  const title = document.createElement('h1');
  title.textContent = 'リプレイ';
  panel.appendChild(title);

  const list = document.createElement('div');
  list.className = 'preset-list';
  panel.appendChild(list);

  const entries = store.list();
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'subtitle';
    empty.textContent = 'まだリプレイがありません（テトリスのひとりプレイで自動保存されます）。';
    list.appendChild(empty);
  }

  for (const e of entries) {
    const row = document.createElement('div');
    row.className = 'preset-row';
    const info = document.createElement('div');
    info.className = 'preset-info';
    const name = document.createElement('div');
    name.className = 'preset-name';
    const d = new Date(e.date);
    name.textContent = `${MODE_LABEL[e.mode] ?? e.mode}  ${e.score.toLocaleString()}点`;
    const desc = document.createElement('div');
    desc.className = 'preset-desc';
    desc.textContent = `${d.toLocaleString()}  /  ${e.lines}ライン`;
    info.append(name, desc);

    const btn = document.createElement('button');
    btn.textContent = '視聴';
    btn.addEventListener('click', () => onPlay(e.replay));

    row.append(info, btn);
    list.appendChild(row);
  }

  const close = document.createElement('button');
  close.textContent = '閉じる';
  close.className = 'primary';
  close.addEventListener('click', onClose);
  panel.appendChild(close);

  return panel;
}
