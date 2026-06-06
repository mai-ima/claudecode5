import type { Snapshot } from '../shared/snapshot';

/**
 * オンライン対戦のメッセージ定義（クライアント側）。
 *
 * 設計（疎結合）: 厳密な状態同期はしない。各自ローカルで独立して進行し、
 * 通信するのは「結果（おじゃま量）」と「相手の描画用 Snapshot」だけ。
 * サーバは中身を解釈せず中継するだけ（server/protocol.ts と論理的に対応）。
 */

/** プレイヤー間でやり取りする内容（サーバが中継する）。 */
export type RelayMessage =
  | { t: 'snapshot'; snapshot: Snapshot }
  | { t: 'attack'; amount: number }
  | { t: 'gameover' };

/** クライアント -> サーバ。 */
export type ClientToServer = { t: 'join'; room: string } | RelayMessage;

/** サーバ -> クライアント。 */
export type ServerToClient =
  | { t: 'joined'; room: string; player: 0 | 1 }
  | { t: 'start' }
  | { t: 'opponentLeft' }
  | RelayMessage;

export const DEFAULT_WS_URL = 'ws://localhost:8080';
