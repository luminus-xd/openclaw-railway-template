# OpenClaw Railway テンプレート（ワンクリックデプロイ）

このリポジトリは **OpenClaw** を Railway 向けにパッケージ化したものです。包括的な **/setup** ウェブウィザードを提供し、**コマンドを一切実行せずに** デプロイとオンボーディングが完了できます。

## 提供される機能

- **OpenClaw Gateway + Control UI**（`/` および `/openclaw` で提供）
- パスワード保護された強力な **セットアップウィザード**（`/setup`）:
  - **デバッグコンソール** — SSH なしで openclaw コマンドを実行
  - **設定エディター** — 自動バックアップ付きで `openclaw.json` を編集
  - **ペアリングヘルパー** — UI からデバイスを承認
  - **プラグイン管理** — プラグインの一覧表示と有効化
  - **バックアップ インポート / エクスポート** — 設定の移行を簡単に
- **Railway ボリューム** による永続ステート（再デプロイ後も設定・認証情報・メモリが保持されます）
- 監視用 **パブリックヘルスエンドポイント**（`/healthz`）
- Ollama・vLLM などの OpenAI 互換 API 向け **カスタムプロバイダーサポート**
- 環境変数による **柔軟な OpenClaw バージョン管理**
- 正確なクライアント IP 取得のための **スマートな Railway プロキシ検出**

## クイックスタート

1. このテンプレートを使って **Railway にデプロイ**
2. 必要な環境変数を設定（下記参照）
3. `https://your-app.up.railway.app/setup` にアクセス
4. セットアップウィザードを完了
5. `/openclaw` でチャットを開始

## 環境変数

### 必須

- **`SETUP_PASSWORD`** — `/setup` ウィザードへのアクセスパスワード

### 推奨

- **`OPENCLAW_STATE_DIR=/data/.openclaw`** — 設定・認証情報ディレクトリ
- **`OPENCLAW_WORKSPACE_DIR=/data/workspace`** — エージェントのワークスペースディレクトリ
- **`OPENCLAW_GATEWAY_TOKEN`** — 安定した認証トークン（未設定時は自動生成）
- **`OPENCLAW_VERSION=v2026.2.15`** — 安定リリースに固定（[バージョン管理](#openclaw-バージョン管理)参照）

### オプション

- **`OPENCLAW_PUBLIC_PORT=8080`** — ラッパーの HTTP ポート（デフォルト: 8080）
- **`PORT`** — `OPENCLAW_PUBLIC_PORT` 未設定時のフォールバック
- **`INTERNAL_GATEWAY_PORT=18789`** — ゲートウェイの内部ポート
- **`OPENCLAW_ENTRY`** — openclaw の entry.js パス（デフォルト: /openclaw/dist/entry.js）
- **`OPENCLAW_TEMPLATE_DEBUG=true`** — デバッグログを有効化（機密トークンもログ出力されます）
- **`OPENCLAW_TRUST_PROXY_ALL=true`** — すべてのプロキシを信頼（Railway では自動検出）

### レガシー（自動移行）

- `CLAWDBOT_*` 変数は自動的に `OPENCLAW_*` へ移行されます
- `MOLTBOT_*` 変数は自動的に `OPENCLAW_*` へ移行されます

## OpenClaw バージョン管理

このテンプレートは、不安定な OpenClaw リリースによる障害を防ぐため、柔軟なバージョン管理をサポートしています。

### 仕組み

**`OPENCLAW_VERSION`** 環境変数でビルドする OpenClaw のバージョンを指定します。

- **`OPENCLAW_VERSION` を設定した場合**: 指定したタグまたはブランチを使用（例: `v2026.2.15`）
- **`OPENCLAW_VERSION` を設定しない場合**: `main` ブランチを使用（不安定な場合があります）

### 推奨設定

```
OPENCLAW_VERSION=v2026.2.15
```

既知の安定リリースに固定することで、上流の変更による障害を防ぎます。

### ユースケース

**安定リリースに固定（推奨）**

```
OPENCLAW_VERSION=v2026.2.15
```

main ブランチが壊れている場合や、一貫したデプロイを確保したい場合に使用します。

**最新 main を使用（上級者向け）**

```
（OPENCLAW_VERSION を未設定のまま）
```

最新の main ブランチを自動的に使用します。テストには適していますが、予期せず壊れる場合があります。

**特定ブランチをテスト**

```
OPENCLAW_VERSION=feature-branch-name
```

未リリース機能のテストに便利です。

### 利用可能なバージョンの確認

すべての OpenClaw リリースを一覧表示するには:

```bash
git ls-remote --tags https://github.com/openclaw/openclaw.git | grep -v '\^{}' | sed 's|.*refs/tags/||'
```

詳細は **[OPENCLAW-VERSION-CONTROL.md](OPENCLAW-VERSION-CONTROL.md)** を参照してください。

## このフォークの新機能

### デバッグコンソール 🔧

SSH なしで openclaw コマンドを実行できます:

- **ゲートウェイライフサイクル:** restart、stop、start
- **OpenClaw CLI:** version、status、health、doctor、logs
- **設定確認:** 任意の設定値を取得
- **デバイス管理:** ペアリングリクエストの一覧表示と承認
- **プラグイン管理:** プラグインの一覧表示と有効化
- **厳格な許可リスト:** 安全な 13 コマンドのみ許可

### 設定エディター ✏️

- ブラウザから直接 `openclaw.json` を編集
- 保存前にタイムスタンプ付き自動バックアップ（`.bak-YYYY-MM-DDTHH-MM-SS-SSSZ`）
- 変更後にゲートウェイを自動再起動
- シンタックスハイライト（等幅フォント）
- バリデーション付き 500KB 安全制限

### ペアリングヘルパー 🔐

- 保留中のデバイスペアリングリクエストを一覧表示
- UI からワンクリックで承認
- SSH 不要
- "disconnected (1008): pairing required" エラーを解消

### バックアップ インポート / エクスポート 💾

- **エクスポート:** 設定 + ワークスペースの `.tar.gz` をダウンロード
- **インポート:** バックアップファイルから復元（最大 250MB）
- パストラバーサル防止機能付き
- 移行や障害復旧に最適

### カスタムプロバイダー 🔌

セットアップ時に OpenAI 互換プロバイダーを追加できます:

- Ollama（ローカル LLM）
- vLLM（高性能サービング）
- LM Studio（デスクトップ GUI）
- 任意の OpenAI 互換 API エンドポイント
- 環境変数による API キーのサポート

### 改善された診断機能 📊

- 認証不要のパブリック `/healthz` エンドポイント
- 総合診断用 `/setup/api/debug`
- 障害時の `openclaw doctor` 自動実行（5分のレート制限）
- トラブルシューティングヒント付き詳細エラーメッセージ
- TCP ベースのゲートウェイヘルスプローブ（より信頼性が高い）

### スマートな Railway 連携 🚂

- `RAILWAY_*` 環境変数による Railway 環境の自動検出
- 正確なクライアント IP のための信頼プロキシを自動設定
- セキュアなローカルホスト専用プロキシ信頼（127.0.0.1）
- `OPENCLAW_TRUST_PROXY_ALL` によるオプションの上書き

### 信頼性の向上 🛡️

- ゲートウェイ準備待機タイムアウトを 60 秒に延長（従来は 20 秒）
- 自動診断付きバックグラウンドヘルス監視
- グレースフルシャットダウン処理（SIGTERM → SIGKILL エスカレーション）
- デバッグ出力でのシークレット隠蔽（5 種類のトークンパターン）
- 厳格な 700 パーミッションによる認証情報ディレクトリ

## Railway デプロイ手順

### Railway テンプレートを使用する場合

1. "Deploy on Railway" ボタンをクリック（利用可能な場合）
2. 環境変数を設定:

**必須:**

- `SETUP_PASSWORD` — `/setup` へのアクセスパスワード

**推奨:**

- `OPENCLAW_VERSION=v2026.2.15` — 安定リリースに固定
- `OPENCLAW_STATE_DIR=/data/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=/data/workspace`

3. Railway が自動的に以下を実行します:
   - `/data` にボリュームを作成
   - Dockerfile からビルド
   - パブリックネットワークを有効化
   - `your-app.up.railway.app` のようなドメインを生成

### Railway 手動セットアップ

1. GitHub リポジトリから新規プロジェクトを作成
2. `/data` にマウントされた **Volume** サービスを追加
3. 環境変数を設定（上記参照）
4. **パブリックネットワーク** を有効化
5. デプロイ

その後:

- `https://<your-app>.up.railway.app/setup` にアクセス（パスワード: `SETUP_PASSWORD` の値）
- セットアップウィザードを完了
- `/openclaw` でチャットを開始

## チャットトークンの取得方法

### Telegram ボットトークン

1. Telegram を開き、**@BotFather** にメッセージを送信
2. `/newbot` を実行し、指示に従う
3. BotFather から `123456789:AA...` 形式のトークンが発行されます
4. そのトークンを `/setup` に貼り付け

### Discord ボットトークン

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. **New Application** → 名前を入力
3. **Bot** タブ → **Add Bot** をクリック
4. **Bot Token** をコピーして `/setup` に貼り付け
5. **重要:** Bot 設定で **MESSAGE CONTENT INTENT** を有効化（必須）
6. ボットをサーバーに招待（OAuth2 URL Generator → スコープ: `bot`、`applications.commands`）

## トラブルシューティング

### "disconnected (1008): pairing required"

**解決策 1: ペアリングヘルパーを使用（UI）**

1. `/setup` にアクセス
2. "Pairing helper" セクションまでスクロール
3. "Refresh pending devices" をクリック
4. 各デバイスの "Approve" をクリック

**解決策 2: デバッグコンソールを使用**

1. `openclaw.devices.list` を選択
2. requestId をメモ
3. `openclaw.devices.approve` を選択
4. requestId を入力して Run をクリック

### "Application failed to respond" / 502 Bad Gateway

1. `/healthz` でゲートウェイのステータスを確認
2. `/setup` → デバッグコンソールにアクセス
3. `openclaw doctor` コマンドを実行
4. `/setup/api/debug` で詳細な診断情報を確認

**よくある原因:**

- ゲートウェイが起動していない（`/healthz` → `gateway.processRunning` を確認）
- `/data` にボリュームがマウントされていない
- `OPENCLAW_STATE_DIR` または `OPENCLAW_WORKSPACE_DIR` 変数が未設定

### ゲートウェイが起動しない

1. `/data` にボリュームがマウントされているか確認
2. 環境変数を確認:

   ```
   OPENCLAW_STATE_DIR=/data/.openclaw
   OPENCLAW_WORKSPACE_DIR=/data/workspace
   ```

3. デバッグコンソールで `openclaw doctor --fix` を実行
4. `/setup/api/debug` で詳細なエラー情報を確認
5. 認証情報ディレクトリが 700 パーミッションで存在するか確認

### トークン不一致エラー

1. Railway Variables に `OPENCLAW_GATEWAY_TOKEN` を設定
2. `/setup` からリセットして再設定
3. または設定エディターで `gateway.auth.token` が一致しているか確認して修正

### Railway でビルドが失敗する

1. OpenClaw の main ブランチが壊れていないか確認
2. `OPENCLAW_VERSION=v2026.2.15` を設定して安定リリースに固定
3. Railway のビルドログで具体的なエラーを確認
4. 必要なファイルがすべてリポジトリに存在するか確認

### バックアップのインポートが失敗する

**"File too large: X.XMB (max 250MB)"**

- エクスポート前にワークスペースファイルを削減
- 大きなデータを複数回に分けてインポート

**"Import requires both STATE_DIR and WORKSPACE_DIR under /data"**

- Railway Variables に以下を設定:

  ```
  OPENCLAW_STATE_DIR=/data/.openclaw
  OPENCLAW_WORKSPACE_DIR=/data/workspace
  ```

**"Config file too large: X.XKB (max 500KB)"**

- 設定が安全制限を超えています
- 設定から不要なデータを削除してください

## ローカル開発

### クイックスモークテスト

```bash
docker build -t openclaw-railway-template .

docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e SETUP_PASSWORD=test \
  -e OPENCLAW_STATE_DIR=/data/.openclaw \
  -e OPENCLAW_WORKSPACE_DIR=/data/workspace \
  -e OPENCLAW_VERSION=v2026.2.15 \
  -v $(pwd)/.tmpdata:/data \
  openclaw-railway-template

# http://localhost:8080/setup を開く（パスワード: test）
```

### ライブリロードでの開発

```bash
# 環境変数を設定
export SETUP_PASSWORD=test
export OPENCLAW_STATE_DIR=/tmp/openclaw-test/.openclaw
export OPENCLAW_WORKSPACE_DIR=/tmp/openclaw-test/workspace
export OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

# ラッパーを起動
npm run dev
# または
node src/server.js

# http://localhost:8080/setup にアクセス（パスワード: test）
```

### ローカルで OpenClaw バージョンを上書き

```bash
docker build --build-arg OPENCLAW_VERSION=v2026.2.16 -t openclaw-test .
```

## ドキュメント

- **[CLAUDE.md](CLAUDE.md)** — 開発者向けドキュメントとアーキテクチャノート
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — コントリビューションガイドラインと開発セットアップ
- **[MIGRATION.md](MIGRATION.md)** — 旧バージョンからの移行ガイド
- **[OPENCLAW-VERSION-CONTROL.md](OPENCLAW-VERSION-CONTROL.md)** — バージョン管理機能の詳細
- **[DAY7-TEST-REPORT.md](DAY7-TEST-REPORT.md)** — 総合テスト結果
- **[QA-SANITY-CHECK-REPORT.md](QA-SANITY-CHECK-REPORT.md)** — ローカル検証結果

## サポート & コミュニティ

- **Issue 報告**: <https://github.com/codetitlan/openclaw-railway-template/issues>
- **Discord**: <https://discord.com/invite/clawd>
- **OpenClaw ドキュメント**: <https://docs.openclaw.com>

## ライセンス

[LICENSE](LICENSE)

## クレジット

[clawdbot-railway-template](https://github.com/vignesh07/clawdbot-railway-template) をベースに大幅な機能拡張を行いました。

### 主な貢献者

- **デバッグコンソール、設定エディター、ペアリングヘルパー** — 強化されたオンボーディングワークフロー
- **バックアップ インポート / エクスポート** — 移行と障害復旧
- **カスタムプロバイダーサポート** — Ollama、vLLM など
- **スマートな Railway 連携**（PR #12 by [@ArtificialSight](https://github.com/ArtificialSight)）— プロキシ検出
- **OpenClaw バージョン管理** — 柔軟なバージョン管理
- **強化された診断機能** — より詳細なエラーメッセージとトラブルシューティング
- **自動移行** — レガシー環境変数のサポート

### 機能一覧

- ✅ デバッグコンソールによる SSH フリーのコマンド実行
- ✅ ブラウザベースの設定編集
- ✅ ワンクリックでのデバイスペアリング承認
- ✅ 完全なバックアップ インポート / エクスポートシステム
- ✅ カスタム AI プロバイダーのサポート
- ✅ 柔軟な OpenClaw バージョン固定
- ✅ スマートな Railway 環境検出
- ✅ 総合的なヘルス監視
- ✅ レガシーテンプレートからの自動移行
- ✅ セキュリティ強化（シークレット隠蔽、パス検証）
