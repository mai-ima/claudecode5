# 本格テトリス（TypeScript + HTML5 Canvas）

拡張性・保守性・統合性を重視して設計した、ガイドライン準拠の本格テトリス。
純粋なゲームロジック（エンジン）を描画・入力・音から完全に分離し、フル型安全・ユニットテスト済み。

## 開発ルール（アセット方針）

- **絵文字は使用しない**（UIテキスト・コード・コミット/PR・READMEを含む全成果物）。
- **画像・SVG 等のアセットは使用可**。アイコン/ロゴ/装飾は絵文字ではなく SVG または画像で実装する
  （例: `public/` 配下のSVG、Canvas描画、インラインSVG）。商標・公式ロゴ・公式音源は同梱しない。

## 本家プリセット（アドオン）

「本家」を完全再現するため、メカニクス＋UIスタイル＋ミノスキン＋背景演出を束ねた
**プリセット（アドオン）**を切り替えられる（トップバー「プリセット」）。

| プリセット | 内容 |
| --- | --- |
| ぷよテト風（既定） | カラフルでにぎやかな基準スタイル |
| 公式ガイドライン風 | クリーンな標準ガイドライン |
| TETR.IO風（競技） | ダーク・高速（DAS短め/ARR0/ソフト40G/all-spin） |
| クラシック(NES/GB)風 | 壁蹴り無し・180無し・スピン無し・ネクスト1・スキャンライン |

メカニクスは **RuleSet 駆動**（`src/modes/tetris/ruleset.ts`）：handling・gravity・lock・
回転系(SRS/classic)・180・スピン判定・nextCount 等をプリセットが上書き。見た目は即時、
挙動は次のゲームから反映。

## 特徴

### テトリス（ガイドライン準拠）
- 10×20 プレイフィールド（上部バッファ付き）、7 種テトロミノ
- SRS（壁蹴り）+ 180 度回転、7-bag ランダマイザ
- Hold（1 回 / 落下）、Ghost、Next 5 表示
- Hard / Soft ドロップ、ロックディレイ（移動でリセット・上限あり）
- T-Spin（full / mini）判定、Combo、Back-to-Back
- ガイドライン準拠のスコア / レベル（重力上昇）

### モード
- **ひとりプレイ（テトリス）** … マラソン
- **スプリント40** … 40 ライン最速（タイム計測）
- **ウルトラ2分** … 制限時間内スコアアタック
- **ぷよぷよ** … 独立エンジン（組ぷよ・ちぎれ・4 連結消去・連鎖・おじゃま・連鎖点滅演出）
- **ローカル対戦（2人）** … 同一画面で 2 人対戦（おじゃま送り・決着）
- **ぷよテト対戦（テト vs ぷよ）** … テトリスとぷよがクロスでおじゃまを送り合う
- **AIと対戦（テトリス）** … 内蔵CPUとオフライン対戦（レーティング反映）
- **オンライン対戦** … Vercel サーバーレス（/api + KV）経由（疎結合・HTTP ポーリング）。ルーム共有シードで同一ツモ

### 内蔵AI（CPU・外部API不使用）
- アルゴリズム型AI（盤面特徴量を重み付け評価）。テトリス／ぷよ両対応。
- **AIと対戦**（オフライン）／**AI代行（オートプレイ）** … `AI代行` ボタン or `F1` で実行中に ON/OFF。
- 難易度（弱／普通／強）を設定で切替（強は1手先読み）。

### 拡張機能・設定
- 設定画面で **表示オプション**（ゴースト／グリッド／ネクスト数／盤面不透明度）、**ハンドリング**（DAS／ARR）、**AI難易度**、**キー再割当**を変更・永続化。
- `R` でリスタート、`P`/`Esc` でポーズ。

### スキン（ミノのみ切替・UIは本家固定）
- UI（背景・枠・配色）は本家（モダンガイドライン）相当で固定。
- **ミノ（ブロック）の見た目だけ**を複数スキンから切替（ガイドライン／モノクロ／ゲームボーイ／ネオン／パステル／サンセット／レトロ）。描画スタイル（立体／フラット／枠線）も含む。
- 模擬ストア（ゲーム内通貨）で購入・装備。

### アカウント / 戦績 / リプレイ
- ローカルプロフィール（名前・アバター）、モード別ベスト（スプリント最速・ウルトラ/マラソン最高）、
  対戦成績、**Eloレーティング**（トップバー「プロフィール」）。
- 決定的リプレイ基盤（`src/replay/`）：シード＋操作列で完全再生（観戦/検証の土台）。

### メカニクス徹底再現（RuleSet 駆動）
- 攻撃（おじゃま）テーブルをプリセット別にデータ化。**相殺（カウンター）**・**予告ゲージ**・
  **穴位置の一貫性（messiness）**・**Perfect Clear**・**Back-to-Back/コンボ**を実装。
- スピン判定は **T-Spin（3コーナー）** と **all-spin（immobile）** をプリセットで切替。
- クラシック回転（壁蹴り無し）・180・ソフト40G 等もルールで切替。

### 演出（プリセット別）
- サウンドテーマ（プリセット毎の波形）、**画面シェイク・パーティクル・危険時フラッシュ・
  Perfect Clear/全消し演出**。

### リプレイ / 観戦
- テトリス 1P を自動録画（シード＋操作列）。**リプレイ一覧／視聴**（決定的再生）。
- 観戦は権威的 WS サーバの spectator ロールで対応。

### バックエンド（Vercel 既定 / 権威的WSサーバ本実装）
- `src/net/transport.ts` の **`NetTransport` 抽象**で通信を分離。既定は Vercel HTTP ポーリング
  （`HttpPollingTransport`）、**`WebSocketTransport` で権威的サーバへ接続**（設定で切替）。
- **権威的 WS サーバ本体** `server/`（ルーム・マッチング・シード配布・**観戦**）。`npm run server` で起動。
- ルーム共有シードで両者同一の 7-bag。公平に対戦。

```bash
npm run server   # ws://localhost:8080 で権威的対戦サーバ起動（設定で「WS使用」をON）
```

### 共通
- ハイスコア永続化（localStorage）、効果音（WebAudio 合成・アセット不要）。
- レスポンシブ描画（盤面サイズから動的算出。テトリス10×20／ぷよ6×12、寸法の異なる2盤面も自動レイアウト）。
- 画面下に操作説明を常時表示。役名バナー・カウントダウン・プリセット別背景演出。

## オンライン対戦（Vercel サーバーレス）

オンライン対戦のバックエンドは **Vercel のサーバーレス関数（`/api`）+ KV** で動く。
常駐 WebSocket は使わず、`join` → 定期 `poll` → `send` の HTTP ポーリングで、
「おじゃまの量」と「相手の描画用 Snapshot」だけを交換する（厳密なフレーム同期はしない）。
サーバ（関数）は中身を解釈せず、相手のメールボックスへ中継するだけ。

### API エンドポイント（`api/`）

| エンドポイント | 役割 |
| --- | --- |
| `POST /api/join` | ルーム参加（プレイヤー番号 0/1 を払い出し、満室は 409） |
| `POST /api/send` | 相手のメールボックスへメッセージを中継 |
| `GET /api/poll` | 開始判定 + 自分宛メッセージの取得 |

### ローカル実行（`vercel dev`）

`/api` 関数を動かすには Vercel CLI が必要（`npm run dev` 単体では静的フロントのみ）。

```bash
npm i -g vercel        # 未導入なら
vercel dev             # フロント + /api を同一オリジンで起動
# ブラウザ 2 つで Online (Tetris) を選び、同じルーム名を入力
```

KV 環境変数（`KV_REST_API_URL` / `KV_REST_API_TOKEN`）が無い場合は、ローカル単一プロセス用の
メモリ実装に自動フォールバックする（同一プロセス内でのみ有効）。

### デプロイ

```bash
vercel               # プレビュー
vercel --prod        # 本番
```

- フロントは `vite build`（`dist/`）として静的配信、`/api/*` はサーバーレス関数として配置される（`vercel.json`）。
- **本番では Vercel KV（Upstash for Redis）の接続が必須**（複数インスタンス間でルーム状態を共有するため）。
  Vercel ダッシュボードで KV を作成し、プロジェクトに環境変数を紐づける。
- API ベースは既定で同一オリジンの `/api`。別オリジンにする場合は `VITE_API_BASE` を設定。

## セットアップ

```bash
npm install
npm run dev        # 開発サーバ (http://localhost:5173)
```

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | 型チェック + 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run test` | ユニットテスト（Vitest） |
| `npm run coverage` | カバレッジ計測 |
| `npm run typecheck` | 型チェック（アプリ） |
| `npm run typecheck:api` | 型チェック（Vercel サーバーレス関数） |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 整形 |
| `npm run verify` | lint + 型 + テスト + ビルドを一括実行（品質ゲート） |

## 操作方法（デフォルト）

### Player 1（テトリス / ぷよ共通の方向）
| キー | 操作 |
| --- | --- |
| ← / → | 移動 |
| ↓ | ソフトドロップ |
| ↑ / X | 右回転 |
| Z | 左回転 |
| A | 180 度回転（テトリス）/ クイックターン（ぷよ） |
| Space | ハードドロップ |
| C / Shift | ホールド（テトリスのみ） |
| P / Esc | ポーズ |

### Player 2（ローカル 2P）
| キー | 操作 |
| --- | --- |
| J / L | 移動 |
| K | ソフトドロップ |
| I / U | 回転 |
| G | ハードドロップ |
| H | ホールド |

## アーキテクチャ

設計の中核は「エンジンの独立」と「最小限の共有契約」。

```
config ─► modes/tetris (TetrisEngine, DOM非依存) ◄─ input / render / audio ─► app ─► main.ts
                                                                              └─► versus / net ─► api/ (Vercel serverless + KV)
shared/  … モード間で共有する契約のみ（Snapshot / EngineView / RNG / Emitter）
```

- **エンジンは共通抽象で縛らない**: `TetrisEngine` と（今後の）`PuyoEngine` は完全に独立。
  共有するのは入力（モード別の Intent 型）と描画用 `Snapshot`、一過性イベントの契約のみ。
- **Snapshot はリッチなセル**: `RenderCell` は生の色ではなく論理 ID を持ち、描画層（`theme` /
  スキン）が色へ変換。`type`/`state` でゴースト半透明やライン消去の明滅を表現。`garbageQueue`
  で予告おじゃまを伝える。
- **状態と瞬間の分離**: 毎フレームの `Snapshot`（状態）とは別に、`lineClear` / `levelUp` 等の
  一過性イベントを `Emitter` で発火し、`AudioManager` が購読して効果音を鳴らす。
- **決定的**: すべての乱数は注入可能な seed 付き RNG（mulberry32）。同一シードで完全再現。

### 主要ディレクトリ

```
src/
  shared/   Snapshot / EngineView / RNG / Emitter（共有契約）
  config/   定数・スコア表・キーマップ
  modes/tetris/  テトリス独立エンジン（SRS/7-bag/T-spin/scoring 等）
  modes/puyo/    ぷよぷよ独立エンジン（連鎖/ちぎれ/おじゃま）
  render/   theme / draw / layout / SnapshotRenderer / HudRenderer
  input/    InputController / PuyoInputController（DAS/ARR, モード別）
  audio/    AudioManager（WebAudio 合成）
  plugins/  プラグイン基盤（描画/スキン限定）
  store/    模擬ストア（通貨/カタログ/所持・装備）
  versus/   VersusController / DummyEngine / 攻撃計算 / コンバタント
  net/      NetClient / protocol（結果 + Snapshot 交換のみ, HTTP ポーリング）
  app/      GameApp / GameLoop / sessions / Settings / HighScoreStore / Screens
api/        Vercel サーバーレス関数（join / send / poll）+ KV ストア（独立 tsconfig）
```

### 拡張性のための要点（設計レビュー反映）

- **エンジンは共通抽象で縛らない**: `TetrisEngine` と `PuyoEngine` は完全に独立。共有は入力
  （モード別 Intent 型）と `Snapshot`、一過性イベントの契約だけ。盤面（`TetrisBoard`/`PuyoBoard`）
  も別実装。
- **オンラインは疎結合**: ローカル独立進行 + 「おじゃま量 + Snapshot」交換のみ。サーバは中継のみ。
- **対戦は席(Slot)抽象**: ローカルは両席に本物エンジン、オンラインは本物 + `DummyEngine`
  （受信 Snapshot を横流し）を刺すことで非対称性を吸収。
- **プラグインは描画/ストア限定**: コアの落下/消去ロジックには介入させない。

## テスト

エンジンのコアロジックは DOM 非依存で、Vitest（node 環境）で網羅的にテストしている
（盤面・SRS・T-Spin・スコア・7-bag・連鎖・対戦・ストア・エンジン統合など）。

```bash
npm run test
```

## 品質ゲート（ローカル検証 / CI は廃止）

GitHub Actions による CI は廃止し、品質チェックは**ローカル検証**に移行した。
1 コマンドで lint・型チェック（app + api）・テスト・ビルドをまとめて実行する。

```bash
npm run verify
```

push 前に自動で `npm run verify` を走らせる git フックも用意している（任意・推奨）。

```bash
npm run hooks:install   # git config core.hooksPath .githooks を設定
# 以降、git push のたびに pre-push フックが検証を実行
# 一時的に回避したい場合: git push --no-verify
```

> なぜ廃止したか: 外部 CI への依存をやめ、検証を手元（push 前フック）で完結させる方針へ移行した。
> 同じチェック内容を `.githooks/pre-push` と `npm run verify` が担うため、品質ゲートは維持される。

## ライセンス

MIT
