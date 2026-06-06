import './style.css';
import { AudioManager } from './audio/AudioManager';
import { loadKeymap } from './config/controls';
import { GameController } from './app/GameController';
import { GameLoop } from './app/GameLoop';
import { HighScoreStore } from './app/HighScoreStore';
import { Overlay } from './app/Screens';
import { Settings } from './app/Settings';
import { InputController } from './input/InputController';
import { TetrisEngine } from './modes/tetris/TetrisEngine';
import { HudRenderer } from './render/HudRenderer';
import { singleBoardLayout } from './render/layout';
import { SnapshotRenderer } from './render/SnapshotRenderer';
import { getTheme } from './render/theme';

const appEl = document.querySelector<HTMLDivElement>('#app');
if (!appEl) throw new Error('#app not found');
appEl.textContent = '';

// --- DOM 構築 ---------------------------------------------------------
const topbar = document.createElement('div');
topbar.className = 'topbar';
const soundBtn = document.createElement('button');
const pauseBtn = document.createElement('button');
pauseBtn.textContent = 'Pause (P)';
topbar.append(soundBtn, pauseBtn);
appEl.appendChild(topbar);

const canvas = document.createElement('canvas');
appEl.appendChild(canvas);
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D context unavailable');

const overlay = new Overlay(appEl);

// --- 依存の生成 -------------------------------------------------------
const settings = new Settings();
const audio = new AudioManager();
audio.setMuted(!settings.soundEnabled);
const highScores = new HighScoreStore();
const engine = new TetrisEngine();
const snapshotRenderer = new SnapshotRenderer(ctx);
const hudRenderer = new HudRenderer(ctx);

const input = new InputController(engine, loadKeymap());

new GameController(engine, audio, highScores, {
  onGameOver: (score, isHigh) => showGameOver(score, isHigh),
});

// --- レイアウト / リサイズ -------------------------------------------
let layout = singleBoardLayout(window.innerWidth, window.innerHeight);

function resize(): void {
  layout = singleBoardLayout(window.innerWidth * 0.96, window.innerHeight * 0.94);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${layout.totalWidth}px`;
  canvas.style.height = `${layout.totalHeight}px`;
  canvas.width = Math.floor(layout.totalWidth * dpr);
  canvas.height = Math.floor(layout.totalHeight * dpr);
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- 描画 -------------------------------------------------------------
function render(): void {
  const theme = getTheme();
  ctx!.fillStyle = theme.background;
  ctx!.fillRect(0, 0, layout.totalWidth, layout.totalHeight);
  const snapshot = engine.getSnapshot();
  const blinkOn = Math.floor(performance.now() / 80) % 2 === 0;
  snapshotRenderer.drawBoard(snapshot, layout, blinkOn);
  hudRenderer.draw(snapshot, layout);
}

// --- ループ -----------------------------------------------------------
const loop = new GameLoop((dt) => {
  input.update(dt);
  engine.tick(dt);
}, render);

// --- UI 操作 ----------------------------------------------------------
function updateSoundBtn(): void {
  soundBtn.textContent = settings.soundEnabled ? 'Sound: ON' : 'Sound: OFF';
}
updateSoundBtn();
soundBtn.addEventListener('click', () => {
  settings.update({ soundEnabled: !settings.soundEnabled });
  audio.setMuted(!settings.soundEnabled);
  updateSoundBtn();
});
pauseBtn.addEventListener('click', () => {
  engine.togglePause();
  reflectPause();
});

function reflectPause(): void {
  if (engine.getPhase() === 'paused') {
    overlay.show('PAUSED', ['P / Esc で再開'], [{ label: 'Resume', onClick: resumeFromPause }]);
  } else {
    overlay.hide();
  }
}
function resumeFromPause(): void {
  if (engine.getPhase() === 'paused') engine.togglePause();
  overlay.hide();
}

// ポーズキーをオーバーレイにも反映。
window.addEventListener('keydown', (e) => {
  audio.resume();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    // InputController が togglePause 済み。表示だけ更新。
    setTimeout(reflectPause, 0);
  }
});

function startGame(): void {
  engine.reset();
  engine.start();
  overlay.hide();
}

function showGameOver(score: number, isHigh: boolean): void {
  overlay.show(
    'GAME OVER',
    [
      `Score: ${score}`,
      `High Score: ${highScores.get()}`,
      ...(isHigh ? ['New Record!'] : []),
    ],
    [{ label: 'Retry', onClick: startGame }],
  );
}

function showStart(): void {
  overlay.show(
    '本格テトリス',
    ['操作: ← → 移動 / ↑ 回転 / Space ハードドロップ / C ホールド / P ポーズ', `High Score: ${highScores.get()}`],
    [{ label: 'Start', onClick: startGame }],
  );
}

// --- 起動 -------------------------------------------------------------
input.attach();
loop.start();
showStart();
