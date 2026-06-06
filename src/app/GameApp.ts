import { AudioManager } from '../audio/AudioManager';
import { DEFAULT_KEYMAP_P1, DEFAULT_KEYMAP_P2, loadKeymap } from '../config/controls';
import { DEFAULT_PUYO_KEYMAP_P1, PuyoInputController } from '../input/PuyoInputController';
import { InputController } from '../input/InputController';
import { PuyoEngine } from '../modes/puyo/PuyoEngine';
import { TetrisEngine } from '../modes/tetris/TetrisEngine';
import { NetClient } from '../net/NetClient';
import { drawText } from '../render/draw';
import { HudRenderer } from '../render/HudRenderer';
import { localizeClearLabel } from '../render/labels';
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
import type { OverlayButton } from './Screens';
import { Settings } from './Settings';
import { buildStoreScreen } from './StoreScreen';
import { LocalVersusSession, OnlineVersusSession, SinglePlayerSession } from './sessions';
import type { Session } from './Session';

const COUNTDOWN_MS = 3400;

interface Banner {
  text: string;
  color: string;
  born: number;
  ttl: number;
}

/** アプリ全体のオーケストレーション（メニュー / セッション / 描画 / 演出 / ストア）。 */
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
  private pauseShown = false;
  private countdown = 0;
  private banner: Banner | null = null;
  private restart: (() => void) | null = null;
  private loop: GameLoop;
  private soundBtn: HTMLButtonElement;

  constructor(private readonly root: HTMLElement) {
    this.root.textContent = '';

    const topbar = document.createElement('div');
    topbar.className = 'topbar';
    const menuBtn = button('メニュー', () => this.showMenu());
    const pauseBtn = button('ポーズ', () => this.session?.togglePause());
    const soundBtn = button('', () => this.toggleSound());
    const storeBtn = button('ストア', () => this.openStore());
    topbar.append(menuBtn, pauseBtn, soundBtn, storeBtn);
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
      (dt) => this.step(dt),
      () => this.render(),
    );
    this.resize();
    this.loop.start();
    this.showMenu();
  }

  // ---- メニュー / モード ---------------------------------------------

  private showMenu(): void {
    this.disposeSession();
    this.pauseShown = false;
    this.overlay.show(
      'テトリス',
      [`ハイスコア  ${this.highScores.get().toLocaleString()}`],
      [
        { label: 'ひとりプレイ（テトリス）', onClick: () => this.startTetris1P(), primary: true },
        { label: 'ぷよぷよ', onClick: () => this.startPuyo1P() },
        { label: 'ローカル対戦（2人）', onClick: () => this.startLocalVersus() },
        { label: 'オンライン対戦', onClick: () => this.startOnline() },
      ],
      { variant: 'menu', subtitle: '本格パズル ― テトリス & ぷよぷよ / 対戦対応' },
    );
  }

  private startSession(session: Session, withCountdown = true): void {
    this.disposeSession();
    this.session = session;
    this.resultShown = false;
    this.pauseShown = false;
    this.banner = null;
    this.countdown = withCountdown ? COUNTDOWN_MS : 0;
    this.layout = this.computeLayout(session.boardCount);
    this.resize();
    session.start();
    this.overlay.hide();
  }

  private startTetris1P(): void {
    this.restart = () => this.startTetris1P();
    const engine = new TetrisEngine();
    this.wireTetris(engine);
    engine.events.on('lineClear', ({ lines }) => this.currency.earn(lines * 10));
    const input = new InputController(engine, loadKeymap());
    this.startSession(new SinglePlayerSession(engine, input));
  }

  private startPuyo1P(): void {
    this.restart = () => this.startPuyo1P();
    const engine = new PuyoEngine();
    this.wirePuyo(engine);
    engine.events.on('chain', ({ count }) => this.currency.earn(count * 15));
    const input = new PuyoInputController(engine, DEFAULT_PUYO_KEYMAP_P1);
    this.startSession(new SinglePlayerSession(engine, input));
  }

  private startLocalVersus(): void {
    this.restart = () => this.startLocalVersus();
    const a = new TetrisEngine();
    const b = new TetrisEngine();
    this.wireTetris(a);
    const inputA = new InputController(a, DEFAULT_KEYMAP_P1);
    const inputB = new InputController(b, DEFAULT_KEYMAP_P2);
    this.startSession(
      new LocalVersusSession(a, inputA, b, inputB, tetrisCombatant(a), tetrisCombatant(b)),
    );
  }

  private startOnline(): void {
    this.restart = () => this.startOnline();
    const room = window.prompt('ルーム名を入力（相手と同じ名前で対戦）', 'room1');
    if (!room) {
      this.showMenu();
      return;
    }
    const local = new TetrisEngine();
    this.wireTetris(local);
    const input = new InputController(local, loadKeymap());
    const dummy = new DummyEngine();
    const combatant = tetrisCombatant(local);

    const net = new NetClient({
      onSnapshot: (snap) => dummy.setSnapshot(snap),
      onAttack: (amount) => local.queueGarbage(amount),
      onOpponentGameOver: () => dummy.markGameOver(),
      onOpponentLeft: () =>
        this.overlay.show('相手が退出しました', [], [{ label: 'メニューへ', onClick: () => this.showMenu(), primary: true }]),
      onStart: () => {
        this.startSession(new OnlineVersusSession(local, input, dummy, net), false);
      },
      onError: (message) =>
        this.overlay.show(
          '接続エラー',
          ['オンラインAPIに接続できません', '`vercel dev` で起動するか Vercel にデプロイしてください', message],
          [{ label: 'メニューへ', onClick: () => this.showMenu(), primary: true }],
        ),
    });
    combatant.onAttack((amount) => net.sendAttack(amount));

    this.overlay.show('対戦相手を待っています…', [`ルーム: ${room}`], [
      {
        label: 'キャンセル',
        onClick: () => {
          net.disconnect();
          this.showMenu();
        },
      },
    ]);
    void net.connect(room);
  }

  // ---- ループ --------------------------------------------------------

  private step(dt: number): void {
    if (!this.session) return;
    if (this.countdown > 0) {
      this.countdown -= dt;
      return;
    }
    this.session.tick(dt);
  }

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

    this.drawBanner();

    if (this.countdown > 0) {
      this.drawCountdown();
      return;
    }

    // 決着判定。
    if (this.session.isOver() && !this.resultShown) {
      this.resultShown = true;
      this.showResult();
      return;
    }
    if (this.resultShown) return;

    // ポーズの反映（入力やボタンによる phase 変化を観測）。
    this.reflectPause(views[0]?.getSnapshot().phase);
  }

  private reflectPause(phase: string | undefined): void {
    if (phase === 'paused' && !this.pauseShown && !this.overlay.isVisible()) {
      this.pauseShown = true;
      this.overlay.show(
        'ポーズ中',
        [],
        [
          { label: '再開', onClick: () => this.session?.togglePause(), primary: true },
          { label: 'メニューへ', onClick: () => this.showMenu() },
        ],
        { variant: 'pause' },
      );
    } else if (phase !== 'paused' && this.pauseShown) {
      this.pauseShown = false;
      this.overlay.hide();
    }
  }

  private showResult(): void {
    if (!this.session) return;
    const score = this.session.views()[0]?.getSnapshot().hud.score ?? 0;
    const isHigh = score > 0 && score >= this.highScores.get();
    const lines = [...this.session.resultLines(), `ハイスコア  ${this.highScores.get().toLocaleString()}`];
    if (isHigh) lines.push('ニューレコード！');
    const buttons: OverlayButton[] = [];
    if (this.restart) buttons.push({ label: 'もう一度', onClick: () => this.restart?.(), primary: true });
    buttons.push({ label: 'メニューへ', onClick: () => this.showMenu() });
    this.overlay.show('リザルト', lines, buttons, { variant: 'result' });
  }

  // ---- 演出 ----------------------------------------------------------

  private setBanner(text: string, color: string, ttl = 1200): void {
    this.banner = { text, color, born: performance.now(), ttl };
  }

  private drawBanner(): void {
    if (!this.banner) return;
    const age = performance.now() - this.banner.born;
    if (age > this.banner.ttl) {
      this.banner = null;
      return;
    }
    const t = age / this.banner.ttl;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.7 ? Math.max(0, 1 - (t - 0.7) / 0.3) : 1;
    const cx = this.layout.totalWidth / 2;
    const cy = this.layout.totalHeight * 0.28 - t * this.layout.totalHeight * 0.04;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    drawText(this.ctx, this.banner.text, cx, cy, {
      color: this.banner.color,
      size: Math.max(28, this.layout.cellSize * 1.4),
      bold: true,
      align: 'center',
      baseline: 'middle',
      shadow: true,
    });
    this.ctx.restore();
  }

  private drawCountdown(): void {
    const n = Math.ceil((this.countdown - 400) / 1000);
    const text = n > 0 ? String(n) : 'スタート！';
    const cx = this.layout.totalWidth / 2;
    const cy = this.layout.totalHeight / 2;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.ctx.fillRect(0, 0, this.layout.totalWidth, this.layout.totalHeight);
    drawText(this.ctx, text, cx, cy, {
      color: getTheme().accent,
      size: Math.max(48, this.layout.cellSize * 2.6),
      bold: true,
      align: 'center',
      baseline: 'middle',
      shadow: true,
    });
    this.ctx.restore();
  }

  // ---- ストア / 設定 -------------------------------------------------

  private openStore(): void {
    const phase = this.session?.views()[0]?.getSnapshot().phase;
    const wasPlaying = this.session !== null && phase === 'playing';
    if (wasPlaying) this.session?.togglePause();
    this.overlay.showNode(
      buildStoreScreen(this.registry, this.catalog, this.currency, this.store, () => {
        this.overlay.hide();
        if (wasPlaying) this.session?.togglePause();
        else if (!this.session || this.session.isOver()) this.showMenu();
      }),
    );
  }

  private toggleSound(): void {
    this.settings.update({ soundEnabled: !this.settings.soundEnabled });
    this.audio.setMuted(!this.settings.soundEnabled);
    this.updateSoundBtn();
  }

  private updateSoundBtn(): void {
    this.soundBtn.textContent = this.settings.soundEnabled ? '♪ オン' : '♪ オフ';
  }

  // ---- イベント配線（音 + 演出 + 報酬）------------------------------

  private wireTetris(engine: TetrisEngine): void {
    const e = engine.events;
    e.on('move', () => this.audio.play('move'));
    e.on('rotate', () => this.audio.play('rotate'));
    e.on('lock', () => this.audio.play('lock'));
    e.on('hold', () => this.audio.play('hold'));
    e.on('hardDrop', () => this.audio.play('hardDrop'));
    e.on('lineClear', ({ lines, tspin, label }) => {
      this.audio.play(lines >= 4 ? 'tetris' : 'lineClear');
      if (label && (lines >= 4 || tspin !== 'none')) {
        this.setBanner(`${localizeClearLabel(label)}！`, getTheme().accent);
      }
    });
    e.on('levelUp', ({ level }) => {
      this.audio.play('levelUp');
      this.setBanner(`レベル ${level}！`, '#facc15');
    });
    e.on('gameOver', () => {
      this.audio.play('gameOver');
      this.highScores.submit(engine.getScore());
    });
  }

  private wirePuyo(engine: PuyoEngine): void {
    const e = engine.events;
    e.on('move', () => this.audio.play('move'));
    e.on('rotate', () => this.audio.play('rotate'));
    e.on('lock', () => this.audio.play('lock'));
    e.on('chain', ({ count }) => {
      this.audio.play(count >= 4 ? 'tetris' : 'lineClear');
      if (count >= 2) this.setBanner(`${count} れんさ！`, getTheme().accent);
    });
    e.on('gameOver', () => {
      this.audio.play('gameOver');
      this.highScores.submit(engine.getScore());
    });
  }

  // ---- 内部 ----------------------------------------------------------

  private disposeSession(): void {
    this.session?.dispose();
    this.session = null;
  }

  private computeLayout(count: number): MultiLayout {
    return multiBoardLayout(window.innerWidth * 0.96, window.innerHeight * 0.9, count);
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
