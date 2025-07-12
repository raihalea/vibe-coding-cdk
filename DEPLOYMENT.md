# AWS WAF Log Analyzer - Deployment Guide

## 🎯 Overview

このガイドでは、AWS WAF Log Analyzerを本番環境にデプロイする手順を説明します。

## 📋 Prerequisites

### 1. 必要なツール

```bash
# Node.js (18.x以上)
node --version

# AWS CLI v2
aws --version

# AWS CDK CLI
npm install -g aws-cdk
cdk --version

# Git
git --version
```

### 2. AWS環境の準備

```bash
# AWS認証情報の設定
aws configure

# または環境変数で設定
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=ap-northeast-1  # 東京リージョン推奨
```

### 3. 必要なAWS権限

デプロイするAWSアカウントには以下の権限が必要です：

- **CloudFormation**: スタック管理
- **IAM**: ロール・ポリシー作成
- **Lambda**: 関数デプロイ
- **API Gateway**: REST API作成
- **S3**: バケット作成・管理
- **DynamoDB**: テーブル作成
- **WAF**: WebACL作成・管理
- **Kinesis Firehose**: 配信ストリーム作成
- **CloudFront**: ディストリビューション作成
- **Bedrock**: AI モデルアクセス

## 🚀 Step-by-Step Deployment

### Step 1: プロジェクトのセットアップ

```bash
# リポジトリのクローン
git clone <your-repository-url>
cd cdk_vibe_coding

# 依存関係のインストール
npm install

# フロントエンドの依存関係もインストール
cd src/frontend
npm install
cd ../..

# プロジェクトのビルド
npm run build
```

### Step 2: CDK環境の初期化

```bash
# CDKブートストラップ（初回のみ）
cdk bootstrap

# 成功メッセージを確認
# ✅ Environment aws://123456789012/ap-northeast-1 bootstrapped.
```

### Step 3: デプロイ前の確認

```bash
# 合成（CloudFormationテンプレート生成）
cdk synth

# デプロイ内容の確認
cdk diff
```

### Step 4: 段階的デプロイ

推奨：スタックを個別にデプロイして問題を早期発見

```bash
# 1. ログ収集基盤をデプロイ
cdk deploy WafAnalyzerWafStack

# 2. 分析APIをデプロイ
cdk deploy WafAnalyzerApiStack

# 3. デモアプリケーションをデプロイ
cdk deploy WafAnalyzerDemoAppStack

# 4. デモ用WAF設定をデプロイ
cdk deploy WafAnalyzerDemoWafStack

# 5. フロントエンドをデプロイ（最後）
cdk deploy WafAnalyzerFrontendStack
```

### Step 5: 全スタック一括デプロイ（上級者向け）

```bash
# 全スタックを一度にデプロイ
cdk deploy --all

# または承認を自動化
cdk deploy --all --require-approval never
```

## 📊 デプロイ後の確認

### 1. スタックの状態確認

```bash
# デプロイされたスタックの確認
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# 出力値の確認
aws cloudformation describe-stacks --stack-name WafAnalyzerFrontendStack \
  --query 'Stacks[0].Outputs'
```

### 2. 主要URLの取得

```bash
# フロントエンドダッシュボードURL
aws cloudformation describe-stacks \
  --stack-name WafAnalyzerFrontendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomainName`].OutputValue' \
  --output text

# デモアプリケーションURL
aws cloudformation describe-stacks \
  --stack-name WafAnalyzerDemoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DemoApiUrl`].OutputValue' \
  --output text

# 分析API URL
aws cloudformation describe-stacks \
  --stack-name WafAnalyzerApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### 3. サービスの動作確認

```bash
# デモアプリケーションの動作確認
DEMO_URL=$(aws cloudformation describe-stacks \
  --stack-name WafAnalyzerDemoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DemoApiUrl`].OutputValue' \
  --output text)

curl -I $DEMO_URL
# HTTP/1.1 200 OK が返ることを確認

# WAFの動作確認（SQLインジェクション攻撃をテスト）
curl "${DEMO_URL}/api/search?q=SELECT%20*%20FROM%20users" \
  -H "User-Agent: sqlmap/1.0"
# HTTP 403 Forbidden が返ることを確認（WAFによるブロック）
```

## 🔧 Configuration

### 1. 環境変数の設定

デプロイ後、必要に応じて以下の設定を調整してください：

```bash
# Bedrockモデルの設定（デフォルト：Claude 3 Sonnet）
export BEDROCK_MODEL_ID="anthropic.claude-3-sonnet-20240229-v1:0"

# ログ保持期間の設定（デフォルト：90日）
export LOG_RETENTION_DAYS=90

# API レート制限の設定
export API_RATE_LIMIT=100
export API_BURST_LIMIT=200
```

### 2. フロントエンド設定

```bash
# フロントエンドの環境設定ファイルを作成
cat > src/frontend/.env.production << EOF
REACT_APP_API_URL=${API_GATEWAY_URL}
REACT_APP_API_KEY=${API_KEY}
EOF

# フロントエンドを再ビルド・再デプロイ
cd src/frontend
npm run build
cd ../..
cdk deploy WafAnalyzerFrontendStack
```

## 🧪 Testing

### 1. 基本動作テスト

```bash
# トラフィック生成でテストデータ作成
node scripts/generate-traffic.js $DEMO_URL --rpm 60 --duration 5

# ログが生成されることを確認
aws s3 ls s3://waf-logs-${AWS_ACCOUNT_ID}-${AWS_REGION}/demo-waf-logs/ --recursive
```

### 2. ダッシュボード動作確認

1. フロントエンドURLにアクセス
2. ログ分析タブで時間範囲を設定
3. 分析開始ボタンをクリック
4. 結果が表示されることを確認

### 3. AI機能テスト

1. AIアシスタントタブを開く
2. パターン分析を実行
3. Amazon Bedrockからの応答を確認

## 🚨 Troubleshooting

### よくある問題と解決方法

#### 1. CDKブートストラップエラー
```bash
Error: This stack uses assets, so the toolkit stack must be deployed
```

**解決方法：**
```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

#### 2. Lambda関数のタイムアウト
```bash
Task timed out after 30.00 seconds
```

**解決方法：**
```bash
# lib/stacks/api-stack.ts でタイムアウトを調整
timeout: Duration.minutes(5)
```

#### 3. Bedrock権限エラー
```bash
AccessDeniedException: User is not authorized to perform: bedrock:InvokeModel
```

**解決方法：**
```bash
# Bedrockモデルアクセス権限を有効化
aws bedrock put-model-invocation-logging-configuration \
  --logging-config '{
    "cloudWatchConfig": {
      "logGroupName": "/aws/bedrock/modelinvocations"
    }
  }'
```

#### 4. フロントエンドビルドエラー
```bash
Module not found: Error: Can't resolve '@mui/material'
```

**解決方法：**
```bash
cd src/frontend
npm install @mui/material @emotion/react @emotion/styled
npm run build
```

#### 5. WAFログが生成されない
```bash
# ログ配信の状態確認
aws firehose describe-delivery-stream \
  --delivery-stream-name aws-waf-logs-demo-delivery-stream

# WAFログ設定の確認
aws wafv2 get-logging-configuration \
  --resource-arn $(aws wafv2 list-web-acls --scope REGIONAL \
    --query 'WebACLs[?Name==`DemoApplicationWAF`].ARN' --output text)
```

## 🔒 Security Considerations

### 1. 本番環境での推奨設定

```bash
# API Gateway でのAPI キー必須化
# IAM ロールの最小権限設定確認
# S3 バケットのパブリックアクセスブロック確認
aws s3api get-public-access-block --bucket waf-logs-${AWS_ACCOUNT_ID}-${AWS_REGION}

# CloudFront でのセキュリティヘッダー設定
```

### 2. 監視・アラート設定

```bash
# CloudWatch アラームの設定例
aws cloudwatch put-metric-alarm \
  --alarm-name "WAF-High-Block-Rate" \
  --alarm-description "High WAF block rate detected" \
  --metric-name "BlockedRequests" \
  --namespace "AWS/WAFV2" \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

## 📈 Monitoring

### 1. 重要なメトリクス

- **WAF**: ブロック率、リクエスト数
- **Lambda**: 実行時間、エラー率
- **API Gateway**: レスポンス時間、スロットリング
- **DynamoDB**: 読み取り/書き込み容量

### 2. ログの確認

```bash
# Lambda 関数のログ
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/WafAnalyzer"

# WAF ログの確認
aws s3 ls s3://waf-logs-${AWS_ACCOUNT_ID}-${AWS_REGION}/demo-waf-logs/ --recursive
```

## 🗑️ Cleanup

### リソースの削除

```bash
# 全スタックの削除（注意：データも削除されます）
cdk destroy --all

# または個別削除
cdk destroy WafAnalyzerFrontendStack
cdk destroy WafAnalyzerDemoWafStack
cdk destroy WafAnalyzerDemoAppStack
cdk destroy WafAnalyzerApiStack
cdk destroy WafAnalyzerWafStack
```

### S3バケットの手動削除

```bash
# S3バケット内のオブジェクトを削除
aws s3 rm s3://waf-logs-${AWS_ACCOUNT_ID}-${AWS_REGION} --recursive
aws s3 rb s3://waf-logs-${AWS_ACCOUNT_ID}-${AWS_REGION}
```

---

## 📞 Support

デプロイで問題が発生した場合：

1. このドキュメントのトラブルシューティングセクションを確認
2. AWS CloudFormation コンソールでエラー詳細を確認
3. CloudWatch Logs でLambda関数のログを確認
4. 必要に応じてIssueを作成

**Happy Deploying! 🚀**