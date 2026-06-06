import type { Snapshot } from '../shared/snapshot';

/**
 * オンライン対戦のメッセージ定義（クライアント側）。
 *
 * 設計（疎結合）: 厳密な状態同期はしない。各自ローカルで独立して進行し、
 * 通信するのは「結果（おじゃま量）」と「相手の描画用 Snapshot」だけ。
 *
 * 転送は Vercel サーバーレス（/api）への HTTP（join / send / poll）。
 * サーバは中身を解釈せず、相手のメールボックスへ中継するだけ。
 */

/** プレイヤー間でやり取りする内容（サーバが中継する）。 */
export type RelayMessage =
  | { t: 'snapshot'; snapshot: Snapshot }
  | { t: 'attack'; amount: number }
  | { t: 'gameover' };

/** /api/join のレスポンス。 */
export interface JoinResponse {
  player: 0 | 1;
  room: string;
}

/** /api/poll のレスポンス。 */
export interface PollResponse {
  started: boolean;
  messages: RelayMessage[];
}

/** API のベースパス（同一オリジンの Vercel サーバーレス）。 */
export const DEFAULT_API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

/** ポーリング間隔（ms）。 */
export const POLL_INTERVAL_MS = 150;
