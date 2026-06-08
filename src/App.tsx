import { onCleanup, onMount } from 'solid-js';
import { GameApp } from './app/GameApp';

/**
 * Solid ルートコンポーネント。
 * 現段階では既存の GameApp ランタイムをホストするブリッジ（以降のフェーズで
 * 画面を順次 Solid コンポーネントへ移行していく）。
 */
export function App() {
  let host!: HTMLDivElement;
  let app: GameApp | undefined;

  onMount(() => {
    app = new GameApp(host);
  });
  onCleanup(() => app?.dispose());

  return <div ref={host} class="app-host" />;
}
