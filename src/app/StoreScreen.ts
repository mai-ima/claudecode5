import type { PluginRegistry } from '../plugins/registry';
import type { Catalog } from '../store/Catalog';
import type { Currency } from '../store/Currency';
import type { StoreModel } from '../store/StoreModel';
import { setTheme } from '../render/theme';

/**
 * 模擬ストア画面の DOM を構築する。スキンの購入・装備ができる。
 * 装備時には setTheme でテーマを即時反映する。
 */
export function buildStoreScreen(
  registry: PluginRegistry,
  catalog: Catalog,
  currency: Currency,
  store: StoreModel,
  onClose: () => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'overlay-panel store';

  const title = document.createElement('h1');
  title.textContent = 'ストア';
  panel.appendChild(title);

  const balance = document.createElement('p');
  const refreshBalance = (): void => {
    balance.textContent = `所持コイン: ${currency.get().toLocaleString()}`;
  };
  refreshBalance();
  panel.appendChild(balance);

  const list = document.createElement('div');
  list.className = 'store-list';
  panel.appendChild(list);

  const renderRow = (): void => {
    list.innerHTML = '';
    for (const entry of catalog.entries()) {
      const row = document.createElement('div');
      row.className = 'store-row';

      const name = document.createElement('span');
      name.textContent = `${entry.name}${entry.price > 0 ? `  ${entry.price} コイン` : '  無料'}`;
      row.appendChild(name);

      const action = document.createElement('button');
      if (store.getEquipped() === entry.id) {
        action.textContent = '装備中';
        action.disabled = true;
      } else if (store.isOwned(entry.id)) {
        action.textContent = '装備する';
        action.addEventListener('click', () => {
          if (store.equip(entry.id)) applyEquipped();
          renderRow();
        });
      } else {
        action.textContent = '購入';
        action.addEventListener('click', () => {
          const result = store.buy(entry.id);
          if (result === 'ok') {
            store.equip(entry.id);
            applyEquipped();
          } else if (result === 'insufficient') {
            action.textContent = 'コイン不足';
            setTimeout(renderRow, 700);
            return;
          }
          refreshBalance();
          renderRow();
        });
      }
      row.appendChild(action);
      list.appendChild(row);
    }
  };

  const applyEquipped = (): void => {
    const skin = registry.findSkin(store.getEquipped());
    if (skin) setTheme(skin.theme);
  };

  renderRow();

  const close = document.createElement('button');
  close.textContent = '閉じる';
  close.addEventListener('click', onClose);
  panel.appendChild(close);

  return panel;
}
