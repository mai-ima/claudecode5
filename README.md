# 本格テトリス（TypeScript + HTML5 Canvas）

拡張性・保守性・統合性を重視して設計した、ガイドライン準拠の本格テトリス。
純粋なゲームロジック（エンジン）を描画・入力・音から完全に分離し、フル型安全・ユニットテスト済み。

## 特徴（現状: 1P テトリス MVP 完成）

- 10×20 プレイフィールド（上部バッファ付き）、7 種テトロミノ
- SRS（壁蹴り）+ 180 度回転、7-bag ランダマイザ
- Hold（1 回 / 落下）、Ghost、Next 5 表示
- Hard / Soft ドロップ、ロックディレイ（移動でリセット・上限あり）
- T-Spin（full / mini）判定、Combo、Back-to-Back
- ガイドライン準拠のスコア / レベル（重力上昇）
- ハイスコア永続化（localStorage）、効果音（WebAudio 合成・アセット不要）
- レスポンシブ描画（画面サイズからセルサイズを動的算出）

### 今後のフェーズ（設計済み）

プラグイン（描画/スキン）+ 模擬ストア → ぷよぷよモード（独立エンジン）→ ローカル 2P 対戦
→ オンライン対戦（Node + ws, 疎結合同期）。詳細は「アーキテクチャ」を参照。

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
| `npm run typecheck:server` | 型チェック（サーバ・Node 用） |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 整形 |

## 操作方法（デフォルト）

| キー | 操作 |
| --- | --- |
| ← / → | 移動 |
| ↓ | ソフトドロップ |
| ↑ / X | 右回転 |
| Z / Ctrl | 左回転 |
| A | 180 度回転 |
| Space | ハードドロップ |
| C / Shift | ホールド |
| P / Esc | ポーズ |

## アーキテクチャ

設計の中核は「エンジンの独立」と「最小限の共有契約」。

```
config ─► modes/tetris (TetrisEngine, DOM非依存) ◄─ input / render / audio ─► app ─► main.ts
                                                                              └─► versus / net ─► server
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
  render/   theme / draw / layout / SnapshotRenderer / HudRenderer
  input/    InputController（DAS/ARR）
  audio/    AudioManager（WebAudio 合成）
  app/      GameLoop / GameController / Settings / HighScoreStore / Screens
server/     オンライン対戦（Node + ws, 独立 tsconfig）
```

## テスト

エンジンのコアロジックは DOM 非依存で、Vitest（node 環境）で網羅的にテストしている
（盤面・SRS・T-Spin・スコア・7-bag・エンジン統合など）。

```bash
npm run test
```

## ライセンス

MIT
