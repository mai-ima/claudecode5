import type { Snapshot } from './snapshot';

/**
 * 対戦コントローラが扱う「席（Slot）」に刺さる最小インターフェイス。
 *
 * - ローカル 2P: 両席に本物のエンジン（TetrisEngine / PuyoEngine）を刺す。
 * - オンライン: 1 席は本物のエンジン、もう 1 席はネット受信 Snapshot を
 *   横流しするだけの DummyEngine を刺す。
 *
 * これにより VersusController はローカル/オンラインの非対称性を意識せずに済む。
 */
export interface EngineView {
  /** 現在の描画用スナップショットを返す。 */
  getSnapshot(): Snapshot;
  /** 決着済みか（トップアウト等）。 */
  isGameOver(): boolean;
}
