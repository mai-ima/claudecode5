/** 画面オーバーレイ（スタート / ポーズ / ゲームオーバー）の DOM 管理。 */
export interface OverlayButton {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface OverlayOptions {
  /** パネルに付与する追加クラス（menu / result など）。 */
  variant?: string;
  /** タイトル下の小見出し。 */
  subtitle?: string;
  /** 見出しに表示する SVG ロゴ（指定時はタイトル文字の代わり）。 */
  logoSvg?: string;
}

export class Overlay {
  private root: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'overlay hidden';
    parent.appendChild(this.root);
  }

  show(
    title: string,
    lines: string[],
    buttons: OverlayButton[],
    options: OverlayOptions = {},
  ): void {
    this.root.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = `overlay-panel${options.variant ? ` ${options.variant}` : ''}`;

    const h = document.createElement('h1');
    if (options.logoSvg) {
      h.classList.add('has-logo');
      h.innerHTML = options.logoSvg;
    } else {
      h.textContent = title;
    }
    panel.appendChild(h);

    if (options.subtitle) {
      const sub = document.createElement('p');
      sub.className = 'subtitle';
      sub.textContent = options.subtitle;
      panel.appendChild(sub);
    }

    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      panel.appendChild(p);
    }

    if (buttons.length > 0) {
      const group = document.createElement('div');
      group.className = 'btn-group';
      for (const btn of buttons) {
        const b = document.createElement('button');
        b.textContent = btn.label;
        if (btn.primary) b.classList.add('primary');
        b.addEventListener('click', btn.onClick);
        group.appendChild(b);
      }
      panel.appendChild(group);
    }

    this.root.appendChild(panel);
    this.root.classList.remove('hidden');
  }

  /** 任意の DOM を中央に表示する（ストア画面など）。 */
  showNode(node: HTMLElement): void {
    this.root.innerHTML = '';
    this.root.appendChild(node);
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  isVisible(): boolean {
    return !this.root.classList.contains('hidden');
  }
}
