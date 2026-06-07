import type { AddonRegistry } from '../addons/registry';

/**
 * プリセット（本家アドオン）選択画面。見た目は即時、挙動は次のゲームから反映。
 */
export function buildPresetScreen(
  addons: AddonRegistry,
  onApply: () => void,
  onClose: () => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'overlay-panel presets';

  const title = document.createElement('h1');
  title.textContent = 'プリセット';
  panel.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'subtitle';
  sub.textContent = '見た目は即時／挙動は次のゲームから反映';
  panel.appendChild(sub);

  const list = document.createElement('div');
  list.className = 'preset-list';
  panel.appendChild(list);

  const render = (): void => {
    list.innerHTML = '';
    for (const addon of addons.list()) {
      const rowEl = document.createElement('div');
      rowEl.className = 'preset-row';

      const info = document.createElement('div');
      info.className = 'preset-info';
      const name = document.createElement('div');
      name.className = 'preset-name';
      name.textContent = addon.name;
      const desc = document.createElement('div');
      desc.className = 'preset-desc';
      desc.textContent = addon.description;
      info.append(name, desc);

      const btn = document.createElement('button');
      if (addons.getActive().id === addon.id) {
        btn.textContent = '適用中';
        btn.disabled = true;
      } else {
        btn.textContent = '適用';
        btn.addEventListener('click', () => {
          addons.setActive(addon.id);
          onApply();
          render();
        });
      }

      rowEl.append(info, btn);
      list.appendChild(rowEl);
    }
  };
  render();

  const close = document.createElement('button');
  close.textContent = '閉じる';
  close.className = 'primary';
  close.addEventListener('click', onClose);
  panel.appendChild(close);

  return panel;
}
