# 本格テトリス（TypeScript + HTML5 Canvas）

拡張性・保守性・統合性を重視して設計した、ガイドライン準拠の本格テトリス。
純粋なゲームロジック（エンジン）を描画・入力・音から完全に分離し、フル型安全・ユニットテスト済み。

## 特徴

### テトリス（ガイドライン準拠）
- 10×20 プレイフィールド（上部バッファ付き）、7 種テトロミノ
- SRS（壁蹴り）+ 180 度回転、7-bag ランダマイザ
- Hold（1 回 / 落下）、Ghost、Next 5 表示
- Hard / Soft ドロップ、ロックディレイ（移動でリセット・上限あり）
- T-Spin（full / mini）判定、Combo、Back-to-Back
- ガイドライン準拠のスコア / レベル（重力上昇）

### モード
- **Tetris 1P** … 1 人プレイ
- **Puyo 1P** … ぷよぷよ（独立エンジン：組ぷよ・ちぎれ・4 連結消去・連鎖・おじゃま）
- **Local 2P (Tetris)** … 同一画面で 2 人対戦（おじゃま送り・決着）
- **Online (Tetris)** … Node + ws サーバ経由のオンライン対戦（疎結合同期）

### 共通
- ハイスコア永続化（localStorage）、効果音（WebAudio 合成・アセット不要）
- レスポンシブ描画（画面サイズからセルサイズを動的算出、2 盤面も自動レイアウト）
- プラグイン（描画/スキン）+ 模擬ストア（ゲーム内通貨でスキン購入・装備）

## オンライン対戦の起動

1 つの端末でリレーサーバを起動し、2 つのタブ（または 2 台）から同じルーム名で参加する。

```bash
npm run server     # ws://localhost:8080 でリレーサーバ起動
npm run dev        # 別ターミナルで開発サーバ
# ブラウザ 2 つで Online (Tetris) を選び、同じルーム名を入力
```

設計上、各プレイヤーはローカルで独立して進行し、通信するのは「おじゃまの量」と
「相手の描画用 Snapshot」だけ（厳密なフレーム同期はしない）。サーバは中身を解釈せず中継する。

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
  modes/puyo/    ぷよぷよ独立エンジン（連鎖/ちぎれ/おじゃま）
  render/   theme / draw / layout / SnapshotRenderer / HudRenderer
  input/    InputController / PuyoInputController（DAS/ARR, モード別）
  audio/    AudioManager（WebAudio 合成）
  plugins/  プラグイン基盤（描画/スキン限定）
  store/    模擬ストア（通貨/カタログ/所持・装備）
  versus/   VersusController / DummyEngine / 攻撃計算 / コンバタント
  net/      NetClient / protocol（結果 + Snapshot 交換のみ）
  app/      GameApp / GameLoop / sessions / Settings / HighScoreStore / Screens
server/     オンライン対戦リレーサーバ（Node + ws, 独立 tsconfig）
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
（盤面・SRS・T-Spin・スコア・7-bag・エンジン統合など）。

```bash
npm run test
```

## ライセンス

MIT
