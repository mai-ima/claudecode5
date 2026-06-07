import { Profile } from '../account/Profile';
import { StatsStore } from '../account/StatsStore';
import { AddonRegistry } from '../addons/registry';
import { AudioManager } from '../audio/AudioManager';
import { SOUND_THEMES } from '../audio/themes';
import { TetrisAiController } from '../ai/AiController';
import { PuyoAiController } from '../ai/PuyoAiController';
import { DEFAULT_KEYMAP_P1, DEFAULT_KEYMAP_P2, loadKeymap } from '../config/controls';
import {
  DEFAULT_PUYO_KEYMAP_P1,
  DEFAULT_PUYO_KEYMAP_P2,
  PuyoInputController,
} from '../input/PuyoInputController';
import { InputController } from '../input/InputController';
import { PuyoEngine } from '../modes/puyo/PuyoEngine';
import { TetrisEngine } from '../modes/tetris/TetrisEngine';
import { NetClient } from '../net/NetClient';
import { seedFromRoom } from '../net/transport';
import { mulberry32 } from '../shared/rng';
import { drawBackground } from '../render/Background';
import { Effects } from '../render/Effects';
import { drawText } from '../render/draw';
import { HudRenderer } from '../render/HudRenderer';
import { localizeClearLabel } from '../render/labels';
import { LOGO_SVG } from '../render/logo';
import { multiBoardLayoutFor } from '../render/layout';
import type { BoardDims, MultiLayout } from '../render/layout';
import { SnapshotRenderer } from '../render/SnapshotRenderer';
import type { RenderOptions } from '../render/SnapshotRenderer';
import { getTheme, setSkin } from '../render/theme';
import type { TetrisRuleSet } from '../modes/tetris/ruleset';
import type { Snapshot } from '../shared/snapshot';
import { PluginRegistry } from '../plugins/registry';
import { skinPlugin } from '../plugins/skins';
import { Catalog } from '../store/Catalog';
import { Currency } from '../store/Currency';
import { StoreModel } from '../store/StoreModel';
import { puyoCombatant, tetrisCombatant } from '../versus/combatants';
import { DummyEngine } from '../versus/DummyEngine';
import { GameLoop } from './GameLoop';
import { HighScoreStore } from './HighScoreStore';
import { InputSwitch } from './InputSwitch';
import { buildOptionsScreen } from './OptionsScreen';
import { buildPresetScreen } from './PresetScreen';
import { buildProfileScreen } from './ProfileScreen';
import { Overlay } from './Screens';
import type { OverlayButton } from './Screens';
import { Settings } from './Settings';
import { buildStoreScreen } from './StoreScreen';
import { LocalVersusSession, OnlineVersusSession, SinglePlayerSession } from './sessions';
import type { Goal } from './sessions';
import type { Session } from './Session';

const COUNTDOWN_MS = 3400;

const FOOTER_TETRIS =
  '操作: ←→ 移動 ／ ↓ ソフト ／ ↑・X 右回転 ／ Z 左回転 ／ A 180回転 ／ Space ハードドロップ ／ C ホールド ／ P ポーズ ／ R リスタート ／ F1 AI代行';
const FOOTER_PUYO =
  '操作: ←→ 移動 ／ ↓ ソフト ／ ↑・X 回転 ／ Z 逆回転 ／ A クイックターン ／ Space 落下 ／ P ポーズ ／ R リスタート ／ F1 AI代行';
const FOOTER_VERSUS =
  '1P: ←→ ↓ ↑/Z A Space C　／　2P: J L K I/U G H　／　P ポーズ・R リスタート';
const FOOTER_AI =
  'あなた(1P): ←→ 移動 ／ ↑ 回転 ／ Space ハードドロップ ／ C ホールド　／　相手: CPU　／　R リスタート';
const FOOTER_ONLINE =
  '操作: ←→ 移動 ／ ↑ 回転 ／ Space ハードドロップ ／ C ホールド ／ P ポーズ';

interface Banner {
  text: string;
  color: string;
  born: number;
  ttl: number;
}

/** アプリ全体のオーケストレーション（メニュー / セッション / 描画 / 演出 / ストア / 設定）。 */
export class GameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private overlay: Overlay;
  private snapshotRenderer: SnapshotRenderer;
  private hudRenderer: HudRenderer;
  private effects = new Effects();
  private footer: HTMLDivElement;

  private audio = new AudioManager();
  private settings = new Settings();
  private highScores = new HighScoreStore();
  private profile = new Profile();
  private stats = new StatsStore();
  private registry = new PluginRegistry();
  private addons = new AddonRegistry();
  private catalog: Catalog;
  private currency = new Currency();
  private store: StoreModel;

  private layout: MultiLayout;
  private session: Session | null = null;
  private autopilot: InputSwitch | null = null;
  private resultShown = false;
  private pauseShown = false;
  private countdown = 0;
  private banner: Banner | null = null;
  private restart: (() => void) | null = null;
  private loop: GameLoop;
  private soundBtn: HTMLButtonElement;
  private aiBtn: HTMLButtonElement;

  constructor(private readonly root: HTMLElement) {
    this.root.textContent = '';

    const topbar = document.createElement('div');
    topbar.className = 'topbar';
    const menuBtn = button('メニュー', () => this.showMenu());
    const pauseBtn = button('ポーズ', () => this.session?.togglePause());
    this.aiBtn = button('AI代行', () => this.toggleAutopilot());
    this.soundBtn = button('', () => this.toggleSound());
    const presetBtn = button('プリセット', () => this.openPresets());
    const optBtn = button('設定', () => this.openOptions());
    const storeBtn = button('ストア', () => this.openStore());
    const profBtn = button('プロフィール', () => this.openProfile());
    topbar.append(menuBtn, pauseBtn, this.aiBtn, this.soundBtn, presetBtn, optBtn, storeBtn, profBtn);
    this.root.appendChild(topbar);

    this.canvas = document.createElement('canvas');
    this.root.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;

    this.footer = document.createElement('div');
    this.footer.className = 'help-footer';
    this.root.appendChild(this.footer);

    this.overlay = new Overlay(this.root);
    this.snapshotRenderer = new SnapshotRenderer(ctx);
    this.hudRenderer = new HudRenderer(ctx);

    this.registry.register(skinPlugin);
    this.catalog = new Catalog(this.registry);
    this.store = new StoreModel(this.catalog, this.currency);
    this.applyLook();

    this.audio.setMuted(!this.settings.soundEnabled);
    this.updateSoundBtn();

    this.layout = this.computeLayout();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onGlobalKey(e));

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
    this.autopilot = null;
    this.pauseShown = false;
    this.updateAiBtn();
    this.setFooter('');
    this.overlay.show(
      'テトリス',
      [`ハイスコア  ${this.highScores.get().toLocaleString()}`],
      [
        { label: 'ひとりプレイ（テトリス）', onClick: () => this.startTetris1P(), primary: true },
        { label: 'ぷよぷよ', onClick: () => this.startPuyo1P() },
        { label: 'スプリント40', onClick: () => this.startTetris1P({ type: 'sprint', lines: 40 }) },
        { label: 'ウルトラ2分', onClick: () => this.startTetris1P({ type: 'ultra', timeMs: 120000 }) },
        { label: 'ローカル対戦（2人）', onClick: () => this.startLocalVersus() },
        { label: 'ぷよテト対戦（テト vs ぷよ）', onClick: () => this.startCrossVersus() },
        { label: 'AIと対戦（テトリス）', onClick: () => this.startAiVersus() },
        { label: 'オンライン対戦', onClick: () => this.startOnline() },
        { label: 'プロフィール / 戦績', onClick: () => this.openProfile() },
        { label: '設定', onClick: () => this.openOptions() },
      ],
      {
        variant: 'menu',
        subtitle: '本格パズル ― テトリス & ぷよぷよ / 対戦・AI対応',
        logoSvg: LOGO_SVG,
      },
    );
  }

  private startSession(session: Session, withCountdown = true): void {
    this.disposeSession();
    this.session = session;
    this.resultShown = false;
    this.pauseShown = false;
    this.banner = null;
    this.countdown = withCountdown ? COUNTDOWN_MS : 0;
    session.start();
    this.layout = this.computeLayout();
    this.resize();
    this.updateAiBtn();
    this.overlay.hide();
  }

  private handling(): { das: number; arr: number } {
    const h = this.addons.getActive().tetrisRules?.handling;
    return h ?? { das: this.settings.all.das, arr: this.settings.all.arr };
  }

  private activeRules(): Partial<TetrisRuleSet> {
    return this.addons.getActive().tetrisRules ?? {};
  }

  /** プリセットの見た目を適用（ストアで装備中のミノがあれば優先）。 */
  private applyLook(): void {
    this.addons.apply();
    this.audio.setTheme(SOUND_THEMES[this.addons.getActive().id] ?? {});
    const eq = this.store.getEquipped();
    if (eq && eq !== 'guideline') {
      const s = this.registry.findSkin(eq);
      if (s) setSkin(s);
    }
  }

  private openPresets(): void {
    const phase = this.session?.views()[0]?.getSnapshot().phase;
    const wasPlaying = this.session !== null && phase === 'playing';
    if (wasPlaying) this.session?.togglePause();
    this.overlay.showNode(
      buildPresetScreen(
        this.addons,
        () => this.applyLook(),
        () => {
          this.overlay.hide();
          if (wasPlaying) this.session?.togglePause();
          else if (!this.session || this.session.isOver()) this.showMenu();
        },
      ),
    );
  }

  private startTetris1P(goal: Goal = { type: 'marathon' }): void {
    this.restart = () => this.startTetris1P(goal);
    const engine = new TetrisEngine({ rules: this.activeRules() });
    this.wireTetris(engine);
    engine.events.on('lineClear', ({ lines }) => this.currency.earn(lines * 10));
    const human = new InputController(engine, loadKeymap(), this.handling());
    const ai = new TetrisAiController(engine, this.settings.all.aiLevel);
    this.autopilot = new InputSwitch(human, ai);
    this.startSession(new SinglePlayerSession(engine, this.autopilot, goal));
    this.setFooter(FOOTER_TETRIS);
  }

  private startPuyo1P(): void {
    this.restart = () => this.startPuyo1P();
    const engine = new PuyoEngine();
    this.wirePuyo(engine);
    engine.events.on('chain', ({ count }) => this.currency.earn(count * 15));
    const human = new PuyoInputController(engine, DEFAULT_PUYO_KEYMAP_P1);
    const ai = new PuyoAiController(engine, this.settings.all.aiLevel);
    this.autopilot = new InputSwitch(human, ai);
    this.startSession(new SinglePlayerSession(engine, this.autopilot));
    this.setFooter(FOOTER_PUYO);
  }

  private startLocalVersus(): void {
    this.restart = () => this.startLocalVersus();
    const a = new TetrisEngine({ rules: this.activeRules() });
    const b = new TetrisEngine({ rules: this.activeRules() });
    this.wireTetris(a);
    const inputA = new InputController(a, DEFAULT_KEYMAP_P1, this.handling());
    const inputB = new InputController(b, DEFAULT_KEYMAP_P2, this.handling());
    this.startSession(
      new LocalVersusSession(a, inputA, b, inputB, tetrisCombatant(a), tetrisCombatant(b)),
    );
    this.setFooter(FOOTER_VERSUS);
  }

  private startAiVersus(): void {
    this.restart = () => this.startAiVersus();
    const a = new TetrisEngine({ rules: this.activeRules() });
    const b = new TetrisEngine({ rules: this.activeRules() });
    this.wireTetris(a);
    const inputA = new InputController(a, loadKeymap(), this.handling());
    const aiB = new TetrisAiController(b, this.settings.all.aiLevel);
    const ratingMap = { easy: 800, normal: 1000, hard: 1300 } as const;
    this.startSession(
      new LocalVersusSession(a, inputA, b, aiB, tetrisCombatant(a), tetrisCombatant(b), {
        opponentRating: ratingMap[this.settings.all.aiLevel],
      }),
    );
    this.setFooter(FOOTER_AI);
  }

  private startCrossVersus(): void {
    this.restart = () => this.startCrossVersus();
    const a = new TetrisEngine({ rules: this.activeRules() });
    this.wireTetris(a);
    const inputA = new InputController(a, DEFAULT_KEYMAP_P1, this.handling());
    const b = new PuyoEngine();
    this.wirePuyo(b);
    const inputB = new PuyoInputController(b, DEFAULT_PUYO_KEYMAP_P2);
    this.startSession(
      new LocalVersusSession(a, inputA, b, inputB, tetrisCombatant(a), puyoCombatant(b)),
    );
    this.setFooter('1P(テトリス): ←→ ↓ ↑/Z A Space C　／　2P(ぷよ): J L K I/U O G　／　R リスタート');
  }

  private startOnline(): void {
    this.restart = () => this.startOnline();
    const room = window.prompt('ルーム名を入力（相手と同じ名前で対戦）', 'room1');
    if (!room) {
      this.showMenu();
      return;
    }
    const seed = seedFromRoom(room);
    const local = new TetrisEngine({ rng: mulberry32(seed), rules: this.activeRules() });
    this.wireTetris(local);
    const input = new InputController(local, loadKeymap(), this.handling());
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
        this.setFooter(FOOTER_ONLINE);
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
      { label: 'キャンセル', onClick: () => { net.disconnect(); this.showMenu(); } },
    ]);
    net.connect(room);
  }

  // ---- ループ --------------------------------------------------------

  private step(dt: number): void {
    if (!this.session) return;
    this.effects.update(dt);
    if (this.countdown > 0) {
      this.countdown -= dt;
      return;
    }
    this.session.tick(dt);
  }

  private boardCenter(i = 0): { x: number; y: number } {
    const b = this.layout.boards[i];
    if (!b) return { x: this.layout.totalWidth / 2, y: this.layout.totalHeight / 2 };
    return { x: b.boardX + (b.cols * b.cellSize) / 2, y: b.boardY + b.rows * b.cellSize * 0.45 };
  }

  private drawDanger(snap: Snapshot, board: { boardX: number; boardY: number; cols: number; rows: number; cellSize: number }): void {
    let top = snap.rows;
    for (let y = 0; y < snap.grid.length; y++) {
      const row = snap.grid[y];
      if (row && row.some((c) => c.type !== 'empty' && c.type !== 'ghost')) {
        top = y;
        break;
      }
    }
    if (top > 3) return;
    const a = 0.1 + 0.1 * Math.sin(performance.now() / 110);
    this.ctx.save();
    this.ctx.globalAlpha = Math.max(0, a);
    this.ctx.fillStyle = '#ff2b2b';
    this.ctx.fillRect(board.boardX, board.boardY, board.cols * board.cellSize, board.rows * board.cellSize);
    this.ctx.restore();
  }

  private renderOptions(): RenderOptions {
    const s = this.settings.all;
    return { ghost: s.ghost, grid: s.grid, boardOpacity: s.boardOpacity };
  }

  private render(): void {
    drawBackground(this.ctx, this.layout.totalWidth, this.layout.totalHeight, performance.now());
    if (!this.session) return;

    const blinkOn = Math.floor(performance.now() / 80) % 2 === 0;
    const opts = this.renderOptions();
    const nextCount = this.settings.all.nextCount;
    const views = this.session.views();

    const shake = this.effects.shakeOffset();
    this.ctx.save();
    this.ctx.translate(shake.x, shake.y);
    for (let i = 0; i < views.length; i++) {
      const board = this.layout.boards[i];
      const view = views[i];
      if (!board || !view) continue;
      const raw = view.getSnapshot();
      const snap: Snapshot = { ...raw, next: raw.next.slice(0, nextCount) };
      this.snapshotRenderer.drawBoard(snap, board, blinkOn, opts);
      this.hudRenderer.draw(snap, board);
      this.drawDanger(snap, board);
    }
    this.ctx.restore();

    this.effects.draw(this.ctx);
    this.drawInfo();
    this.drawBanner();

    if (this.countdown > 0) {
      this.drawCountdown();
      return;
    }

    if (this.session.isOver() && !this.resultShown) {
      this.resultShown = true;
      this.showResult();
      return;
    }
    if (this.resultShown) return;

    this.reflectPause(views[0]?.getSnapshot().phase);
  }

  private drawInfo(): void {
    const lines = this.session?.info?.();
    if (!lines || lines.length === 0) return;
    const cx = (this.layout.boards[0]?.boardX ?? 0) + ((this.layout.boards[0]?.cols ?? 10) * this.layout.cellSize) / 2;
    let y = 2;
    for (const line of lines) {
      drawText(this.ctx, line, cx, y, {
        color: getTheme().text,
        size: Math.max(12, this.layout.cellSize * 0.5),
        bold: true,
        align: 'center',
        shadow: true,
      });
      y += this.layout.cellSize * 0.55;
    }
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

  private recordOutcome(): void {
    const o = this.session?.outcome?.();
    if (!o) return;
    if (o.kind === 'solo') this.stats.recordSolo(o);
    else this.stats.recordVersus(o);
  }

  private showResult(): void {
    if (!this.session) return;
    this.recordOutcome();
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

  // ---- ストア / 設定 / AI -------------------------------------------

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

  private openProfile(): void {
    const phase = this.session?.views()[0]?.getSnapshot().phase;
    const wasPlaying = this.session !== null && phase === 'playing';
    if (wasPlaying) this.session?.togglePause();
    this.overlay.showNode(
      buildProfileScreen(this.profile, this.stats, () => {
        this.overlay.hide();
        if (wasPlaying) this.session?.togglePause();
        else if (!this.session || this.session.isOver()) this.showMenu();
      }),
    );
  }

  private openOptions(): void {
    const phase = this.session?.views()[0]?.getSnapshot().phase;
    const wasPlaying = this.session !== null && phase === 'playing';
    if (wasPlaying) this.session?.togglePause();
    this.overlay.showNode(
      buildOptionsScreen(
        this.settings,
        () => this.audio.setMuted(!this.settings.soundEnabled),
        () => {
          this.overlay.hide();
          if (wasPlaying) this.session?.togglePause();
          else if (!this.session || this.session.isOver()) this.showMenu();
        },
      ),
    );
  }

  private toggleAutopilot(): void {
    if (!this.autopilot) return;
    this.autopilot.setAi(!this.autopilot.isAi());
    this.updateAiBtn();
  }

  private updateAiBtn(): void {
    const on = this.autopilot?.isAi() ?? false;
    this.aiBtn.textContent = on ? 'AI代行: ON' : 'AI代行';
    this.aiBtn.classList.toggle('active', on);
    this.aiBtn.disabled = !this.autopilot;
  }

  private toggleSound(): void {
    this.settings.update({ soundEnabled: !this.settings.soundEnabled });
    this.audio.setMuted(!this.settings.soundEnabled);
    this.updateSoundBtn();
  }

  private updateSoundBtn(): void {
    this.soundBtn.textContent = this.settings.soundEnabled ? '♪ オン' : '♪ オフ';
  }

  private onGlobalKey(e: KeyboardEvent): void {
    this.audio.resume();
    if (this.overlay.isVisible()) return;
    if (e.code === 'KeyR' && this.restart) {
      e.preventDefault();
      this.restart();
    } else if (e.code === 'F1') {
      e.preventDefault();
      this.toggleAutopilot();
    }
  }

  // ---- イベント配線（音 + 演出 + 報酬）------------------------------

  private wireTetris(engine: TetrisEngine): void {
    const e = engine.events;
    e.on('move', () => this.audio.play('move'));
    e.on('rotate', () => this.audio.play('rotate'));
    e.on('lock', () => this.audio.play('lock'));
    e.on('hold', () => this.audio.play('hold'));
    e.on('hardDrop', () => {
      this.audio.play('hardDrop');
      this.effects.shake(3, 110);
    });
    e.on('lineClear', ({ lines, tspin, label }) => {
      this.audio.play(lines >= 4 ? 'tetris' : 'lineClear');
      const c = this.boardCenter();
      this.effects.shake(lines >= 4 ? 14 : 7, lines >= 4 ? 420 : 240);
      this.effects.burst(c.x, c.y, getTheme().accent, lines >= 4 ? 42 : 22);
      if (label && (lines >= 4 || tspin !== 'none')) {
        this.setBanner(`${localizeClearLabel(label)}！`, getTheme().accent);
      }
    });
    e.on('perfectClear', () => {
      const c = this.boardCenter();
      this.effects.shake(20, 600);
      this.effects.burst(c.x, c.y, getTheme().accent2, 60, 1.6);
      this.setBanner('パーフェクトクリア！', getTheme().accent2, 1500);
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
      const c = this.boardCenter();
      this.effects.shake(6 + count * 2, 280);
      this.effects.burst(c.x, c.y, getTheme().accent, 16 + count * 6);
      if (count >= 2) this.setBanner(`${count} れんさ！`, getTheme().accent);
    });
    e.on('gameOver', () => {
      this.audio.play('gameOver');
      this.highScores.submit(engine.getScore());
    });
  }

  // ---- フッター / レイアウト ----------------------------------------

  private setFooter(text: string): void {
    this.footer.textContent = text;
  }

  private disposeSession(): void {
    this.session?.dispose();
    this.session = null;
  }

  private boardDimsList(): BoardDims[] {
    const views = this.session?.views();
    if (!views || views.length === 0) return [{ cols: 10, rows: 20 }];
    return views.map((v) => {
      const s = v.getSnapshot();
      return { cols: s.cols, rows: s.rows };
    });
  }

  private computeLayout(): MultiLayout {
    return multiBoardLayoutFor(
      window.innerWidth * 0.96,
      window.innerHeight * 0.86,
      this.boardDimsList(),
    );
  }

  private resize(): void {
    this.layout = this.computeLayout();
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
