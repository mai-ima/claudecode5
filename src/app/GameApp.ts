import { AudioManager } from '../audio/AudioManager';
import { DEFAULT_KEYMAP_P1, DEFAULT_KEYMAP_P2, loadKeymap } from '../config/controls';
import { DEFAULT_PUYO_KEYMAP_P1, PuyoInputController } from '../input/PuyoInputController';
import { InputController } from '../input/InputController';
import { PuyoEngine } from '../modes/puyo/PuyoEngine';
import { TetrisEngine } from '../modes/tetris/TetrisEngine';
import { DEFAULT_WS_URL } from '../net/protocol';
import { NetClient } from '../net/NetClient';
import { HudRenderer } from '../render/HudRenderer';
import { multiBoardLayout } from '../render/layout';
import type { MultiLayout } from '../render/layout';
import { SnapshotRenderer } from '../render/SnapshotRenderer';
import { getTheme, setTheme } from '../render/theme';
import { PluginRegistry } from '../plugins/registry';
import { skinPlugin } from '../plugins/skins';
import { Catalog } from '../store/Catalog';
import { Currency } from '../store/Currency';
import { StoreModel } from '../store/StoreModel';
import { tetrisCombatant } from '../versus/combatants';
import { DummyEngine } from '../versus/DummyEngine';
import { GameLoop } from './GameLoop';
import { HighScoreStore } from './HighScoreStore';
import { Overlay } from './Screens';
import { Settings } from './Settings';
import { buildStoreScreen } from './StoreScreen';
import { LocalVersusSession, OnlineVersusSession, SinglePlayerSession } from './sessions';
import type { Session } from './Session';

/** アプリ全体のオーケストレーション（メニュー / セッション / 描画 / ストア）。 */
export class GameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private overlay: Overlay;
  private snapshotRenderer: SnapshotRenderer;
  private hudRenderer: HudRenderer;

  private audio = new AudioManager();
  private settings = new Settings();
  private highScores = new HighScoreStore();
  private registry = new PluginRegistry();
  private catalog: Catalog;
  private currency = new Currency();
  private store: StoreModel;

  private layout: MultiLayout;
  private session: Session | null = null;
  private resultShown = false;
  private loop: GameLoop;

  constructor(private readonly root: HTMLElement) {
    this.root.textContent = '';

    const topbar = document.createElement('div');
    topbar.className = 'topbar';
    const menuBtn = button('Menu', () => this.showMenu());
    const soundBtn = button('', () => this.toggleSound());
    const storeBtn = button('Store', () => this.openStore());
    topbar.append(menuBtn, soundBtn, storeBtn);
    this.root.appendChild(topbar);
    this.soundBtn = soundBtn;

    this.canvas = document.createElement('canvas');
    this.root.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;

    this.overlay = new Overlay(this.root);
    this.snapshotRenderer = new SnapshotRenderer(ctx);
    this.hudRenderer = new HudRenderer(ctx);

    this.registry.register(skinPlugin);
    this.catalog = new Catalog(this.registry);
    this.store = new StoreModel(this.catalog, this.currency);
    const skin = this.registry.findSkin(this.store.getEquipped());
    if (skin) setTheme(skin.theme);

    this.audio.setMuted(!this.settings.soundEnabled);
    this.updateSoundBtn();

    this.layout = this.computeLayout(1);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', () => this.audio.resume(), { once: true });

    this.loop = new GameLoop(
      (dt) => this.session?.tick(dt),
      () => this.render(),
    );
    this.resize();
    this.loop.start();
    this.showMenu();
  }

  private soundBtn: HTMLButtonElement;

  // ---- メニュー / モード ---------------------------------------------

  private showMenu(): void {
    this.disposeSession();
    this.overlay.show('本格テトリス', ['モードを選択', `High Score: ${this.highScores.get()}`], [
      { label: 'Tetris 1P', onClick: () => this.startTetris1P() },
      { label: 'Puyo 1P', onClick: () => this.startPuyo1P() },
      { label: 'Local 2P (Tetris)', onClick: () => this.startLocalVersus() },
      { label: 'Online (Tetris)', onClick: () => this.startOnline() },
    ]);
  }

  private startSession(session: Session): void {
    this.disposeSession();
    this.session = session;
    this.resultShown = false;
    this.layout = this.computeLayout(session.boardCount);
    this.resize();
    session.start();
    this.overlay.hide();
  }

  private startTetris1P(): void {
    const engine = new TetrisEngine();
    this.wireTetrisAudio(engine);
    engine.events.on('lineClear', ({ lines }) => this.currency.earn(lines * 10));
    const input = new InputController(engine, loadKeymap());
    this.startSession(new SinglePlayerSession(engine, input));
  }

  private startPuyo1P(): void {
    const engine = new PuyoEngine();
    this.wirePuyoAudio(engine);
    engine.events.on('chain', ({ count }) => this.currency.earn(count * 15));
    const input = new PuyoInputController(engine, DEFAULT_PUYO_KEYMAP_P1);
    this.startSession(new SinglePlayerSession(engine, input));
  }

  private startLocalVersus(): void {
    const a = new TetrisEngine();
    const b = new TetrisEngine();
    this.wireTetrisAudio(a);
    const inputA = new InputController(a, DEFAULT_KEYMAP_P1);
    const inputB = new InputController(b, DEFAULT_KEYMAP_P2);
    this.startSession(
      new LocalVersusSession(a, inputA, b, inputB, tetrisCombatant(a), tetrisCombatant(b)),
    );
  }

  private startOnline(): void {
    const room = window.prompt('ルーム名を入力（相手と同じ名前で対戦）', 'room1');
    if (!room) {
      this.showMenu();
      return;
    }
    const local = new TetrisEngine();
    this.wireTetrisAudio(local);
    const input = new InputController(local, loadKeymap());
    const dummy = new DummyEngine();

    // 攻撃計算を再利用してネット送信。
    const combatant = tetrisCombatant(local);

    const net = new NetClient({
      onSnapshot: (snap) => dummy.setSnapshot(snap),
      onAttack: (amount) => local.queueGarbage(amount),
      onOpponentGameOver: () => dummy.markGameOver(),
      onOpponentLeft: () => this.overlay.show('相手が退出しました', [], [
        { label: 'Menu', onClick: () => this.showMenu() },
      ]),
      onStart: () => {
        this.startSession(new OnlineVersusSession(local, input, dummy, net));
      },
      onError: () =>
        this.overlay.show(
          '接続エラー',
          ['サーバを起動してください: npm run server', DEFAULT_WS_URL],
          [{ label: 'Menu', onClick: () => this.showMenu() }],
        ),
    });
    combatant.onAttack((amount) => net.sendAttack(amount));

    this.overlay.show('対戦相手を待っています...', [`Room: ${room}`], [
      { label: 'Cancel', onClick: () => {
        net.disconnect();
        this.showMenu();
      } },
    ]);
    net.connect(room);
  }

  // ---- 描画 ----------------------------------------------------------

  private render(): void {
    const theme = getTheme();
    this.ctx.fillStyle = theme.background;
    this.ctx.fillRect(0, 0, this.layout.totalWidth, this.layout.totalHeight);
    if (!this.session) return;

    const blinkOn = Math.floor(performance.now() / 80) % 2 === 0;
    const views = this.session.views();
    for (let i = 0; i < views.length; i++) {
      const board = this.layout.boards[i];
      const view = views[i];
      if (!board || !view) continue;
      const snap = view.getSnapshot();
      this.snapshotRenderer.drawBoard(snap, board, blinkOn);
      this.hudRenderer.draw(snap, board);
    }

    if (this.session.isOver() && !this.resultShown) {
      this.resultShown = true;
      this.showResult();
    }
  }

  private showResult(): void {
    if (!this.session) return;
    this.overlay.show('RESULT', this.session.resultLines(), [
      { label: 'Menu', onClick: () => this.showMenu() },
    ]);
  }

  // ---- ストア / 設定 -------------------------------------------------

  private openStore(): void {
    this.overlay.showNode(
      buildStoreScreen(this.registry, this.catalog, this.currency, this.store, () => {
        if (this.session && !this.session.isOver()) this.overlay.hide();
        else this.showMenu();
      }),
    );
  }

  private toggleSound(): void {
    this.settings.update({ soundEnabled: !this.settings.soundEnabled });
    this.audio.setMuted(!this.settings.soundEnabled);
    this.updateSoundBtn();
  }

  private updateSoundBtn(): void {
    this.soundBtn.textContent = this.settings.soundEnabled ? 'Sound: ON' : 'Sound: OFF';
  }

  // ---- 内部 ----------------------------------------------------------

  private wireTetrisAudio(engine: TetrisEngine): void {
    const e = engine.events;
    e.on('move', () => this.audio.play('move'));
    e.on('rotate', () => this.audio.play('rotate'));
    e.on('lock', () => this.audio.play('lock'));
    e.on('hold', () => this.audio.play('hold'));
    e.on('hardDrop', () => this.audio.play('hardDrop'));
    e.on('lineClear', ({ lines }) => this.audio.play(lines >= 4 ? 'tetris' : 'lineClear'));
    e.on('levelUp', () => this.audio.play('levelUp'));
    e.on('gameOver', () => {
      this.audio.play('gameOver');
      this.highScores.submit(engine.getScore());
    });
  }

  private wirePuyoAudio(engine: PuyoEngine): void {
    const e = engine.events;
    e.on('move', () => this.audio.play('move'));
    e.on('rotate', () => this.audio.play('rotate'));
    e.on('lock', () => this.audio.play('lock'));
    e.on('chain', ({ count }) => this.audio.play(count >= 4 ? 'tetris' : 'lineClear'));
    e.on('gameOver', () => {
      this.audio.play('gameOver');
      this.highScores.submit(engine.getScore());
    });
  }

  private disposeSession(): void {
    this.session?.dispose();
    this.session = null;
  }

  private computeLayout(count: number): MultiLayout {
    return multiBoardLayout(window.innerWidth * 0.96, window.innerHeight * 0.94, count);
  }

  private resize(): void {
    const count = this.session?.boardCount ?? 1;
    this.layout = this.computeLayout(count);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${this.layout.totalWidth}px`;
    this.canvas.style.height = `${this.layout.totalHeight}px`;
    this.canvas.width = Math.floor(this.layout.totalWidth * dpr);
    this.canvas.height = Math.floor(this.layout.totalHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
