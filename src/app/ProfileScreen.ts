import type { Profile } from '../account/Profile';
import type { StatsStore } from '../account/StatsStore';

function fmtTime(ms: number | null): string {
  if (ms === null) return '—';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** プロフィール / 戦績画面。 */
export function buildProfileScreen(
  profile: Profile,
  stats: StatsStore,
  onClose: () => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'overlay-panel profile';

  const title = document.createElement('h1');
  title.textContent = 'プロフィール';
  panel.appendChild(title);

  // 名前編集。
  const nameRow = document.createElement('div');
  nameRow.className = 'opt-row';
  const nameLabel = document.createElement('span');
  nameLabel.textContent = '名前';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 16;
  nameInput.value = profile.name;
  nameInput.addEventListener('change', () => profile.setName(nameInput.value));
  nameRow.append(nameLabel, nameInput);

  const body = document.createElement('div');
  body.className = 'options-body';
  body.appendChild(nameRow);

  const s = stats.all;
  const row = (label: string, value: string): void => {
    const r = document.createElement('div');
    r.className = 'opt-row';
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('span');
    v.textContent = value;
    r.append(l, v);
    body.appendChild(r);
  };
  row('レーティング', String(s.rating));
  row('対戦成績', `${s.wins}勝 ${s.losses}敗`);
  row('プレイ回数', String(s.games));
  row('累計ライン', String(s.totalLines));
  row('スプリント最速', fmtTime(s.sprintBestMs));
  row('ウルトラ最高', s.ultraBestScore === null ? '—' : s.ultraBestScore.toLocaleString());
  row('マラソン最高', s.marathonBestScore === null ? '—' : s.marathonBestScore.toLocaleString());

  panel.appendChild(body);

  const close = document.createElement('button');
  close.textContent = '閉じる';
  close.className = 'primary';
  close.addEventListener('click', onClose);
  panel.appendChild(close);

  return panel;
}
