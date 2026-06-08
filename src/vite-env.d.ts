/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** オンライン対戦 API のベースパス（既定は /api）。 */
  readonly VITE_API_BASE?: string;
  /** 既定の WebSocket サーバ URL。 */
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
