/** 画面オーバーレイ（スタート / ポーズ / ゲームオーバー）の DOM 管理。 */
export interface OverlayButton {
  label: string;
  onClick: () => void;
}

export class Overlay {
  private root: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'overlay hidden';
    parent.appendChild(this.root);
  }

  show(title: string, lines: string[], buttons: OverlayButton[]): void {
    this.root.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'overlay-panel';

    const h = document.createElement('h1');
    h.textContent = title;
    panel.appendChild(h);

    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      panel.appendChild(p);
    }

    for (const btn of buttons) {
      const b = document.createElement('button');
      b.textContent = btn.label;
      b.addEventListener('click', btn.onClick);
      panel.appendChild(b);
    }

    this.root.appendChild(panel);
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
