# AWS WAF Log Analyzer

## プロジェクト概要

AWS WAF Log Analyzerは、AWS WAFのログを分析し、セキュリティルールの最適化を支援するWebアプリケーションです。Amazon Bedrockを活用したAI機能により、インテリジェントなルール設定の推奨を行います。

## 主要機能

### 1. WAFログ分析ダッシュボード
- リアルタイムログ監視
- 攻撃パターンの可視化
- トラフィック傾向分析
- 異常検知アラート

### 2. ルール管理機能
- **マネージドルールグループ**: AWS提供のルールグループの有効化/無効化、設定調整
- **カスタムルール**: 独自のWAFルール作成・編集・削除
- **レートベースルール**: トラフィック分析に基づく閾値の自動調整

### 3. AI支援機能（Amazon Bedrock）
- ログパターンからの脅威分析
- 最適なルール設定の提案
- 誤検知の削減提案
- セキュリティポスチャーの改善推奨

### 4. デモ環境
- **テスト用Webアプリケーション**: 様々な攻撃パターンをシミュレート
- **包括的WAF設定**: マネージドルール + カスタムルール + レート制限
- **トラフィック生成ツール**: 自動的な正常・異常トラフィックの生成
- **ログ統合**: デモアプリのWAFログが自動的に分析システムに送信

## 技術スタック

### インフラストラクチャ
- **AWS CDK (TypeScript)**: インフラのコード化
- **AWS WAF**: Webアプリケーションファイアウォール
- **Amazon Bedrock**: AI/ML機能の提供
- **AWS Lambda**: サーバーレス処理
- **Amazon S3**: ログストレージ
- **Amazon DynamoDB**: メタデータストア

### フロントエンド
- **React + TypeScript**: UIフレームワーク
- **AWS Amplify**: ホスティング・認証
- **Chart.js**: データ可視化

### バックエンド
- **Node.js + TypeScript**: APIサーバー
- **AWS API Gateway**: APIエンドポイント
- **AWS SDK**: AWSサービス連携

## 開発ガイドライン

### コーディング規約
- TypeScriptの厳格な型チェックを使用
- ESLint + Prettierによる自動フォーマット
- 全ての新機能にユニットテストを追加

### アーキテクチャ図の管理
アーキテクチャに変更があった場合は、必ず以下の手順でアーキテクチャ図を更新してください：

#### 📋 更新が必要なケース
- 新しいAWSサービスの追加
- CDKスタックの構成変更
- データフローの変更
- セキュリティ要件の変更
- 新機能によるコンポーネント追加

#### 🔄 更新手順
```bash
# 1. アーキテクチャディレクトリに移動
cd architecture

# 2. architecture.pyを編集して変更を反映
# - 新しいコンポーネントの追加
# - 既存コンポーネントの修正
# - 接続関係の更新

# 3. アーキテクチャ図を再生成
./generate.sh

# 4. 生成された図を確認
ls -la *.png

# 5. 変更をコミット
git add .
git commit -m "Update architecture diagrams: [変更内容]"
```

#### 📁 管理対象ファイル
- `architecture/architecture.py` - ダイアグラム定義（IaC）
- `architecture/waf-analyzer-architecture.png` - メイン図
- `architecture/data-flow.png` - データフロー図
- `architecture/security-architecture.png` - セキュリティ図
- `architecture/deployment-architecture.png` - デプロイメント図

#### ⚠️ 重要な注意事項
- アーキテクチャ図は **Infrastructure as Code** で管理されています
- 手動でPNG画像を編集しないでください
- 変更は必ず `architecture.py` を通じて行ってください
- 図の一貫性を保つため、色やスタイルは既存パターンに従ってください

### CDK構成
```
lib/
├── stacks/
│   ├── waf-stack.ts          # メインWAF設定とログ収集
│   ├── api-stack.ts          # 分析API Gateway + Lambda
│   ├── frontend-stack.ts     # React Webダッシュボード
│   ├── demo-app-stack.ts     # デモアプリケーション
│   └── demo-waf-stack.ts     # デモ用WAF設定
src/
├── backend/                  # 分析Lambda関数
│   ├── log-analyzer.js       # ログ分析エンジン
│   ├── rule-manager.js       # ルール管理API
│   └── ai-assistant.js       # AI分析機能
├── demo-backend/             # デモアプリLambda関数
│   ├── demo-website.js       # デモWebサイト
│   └── demo-api.js           # デモAPI
└── frontend/                 # React Webアプリ
    └── src/components/       # ダッシュボードコンポーネント
scripts/
└── generate-traffic.js      # トラフィック生成ツール
```

### テスト戦略
- ユニットテスト: Jest
- 統合テスト: AWS CDK Testing Framework
- E2Eテスト: Cypress

## セキュリティ考慮事項
- IAMロールの最小権限原則
- APIエンドポイントの認証・認可
- ログデータの暗号化
- VPCエンドポイントの使用

## デモ環境の使用方法

### 1. デプロイ後の確認
```bash
# デモアプリケーションのURL取得
aws cloudformation describe-stacks \
  --stack-name WafAnalyzerDemoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DemoApiUrl`].OutputValue' \
  --output text
```

### 2. デモWebサイトでのテスト
デモアプリケーションには以下のテスト機能が含まれています：
- **通常のフォーム送信**: 正常なユーザー操作をシミュレート
- **SQLインジェクション**: 悪意のあるクエリをテスト
- **XSS攻撃**: スクリプトインジェクションをテスト
- **管理者エリアアクセス**: 権限エスカレーション攻撃をテスト
- **ボット・スキャナー**: 自動化ツールをシミュレート
- **レート制限**: 高頻度リクエストをテスト

### 3. 自動トラフィック生成
```bash
# 正常トラフィックのみ
node scripts/generate-traffic.js <DEMO_URL> --legitimate-only --rpm 60 --duration 5

# 悪意のあるトラフィックのみ
node scripts/generate-traffic.js <DEMO_URL> --malicious-only --rpm 30 --duration 3

# 混合トラフィック（推奨）
node scripts/generate-traffic.js <DEMO_URL> --rpm 120 --duration 10
```

### 4. ログ分析の実行
トラフィック生成後、WAF Log Analyzerダッシュボードで：
1. ログ分析タブで時間範囲を設定
2. 分析開始ボタンをクリック
3. 結果の可視化と統計を確認
4. AIアシスタントタブでパターン分析を実行