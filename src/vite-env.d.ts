/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** オンライン対戦 API のベースパス（既定は /api）。 */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
