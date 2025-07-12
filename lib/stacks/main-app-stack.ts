import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesisfirehose';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';

export class MainAppStack extends Stack {
  public readonly logBucket: s3.Bucket;
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly api: apigateway.RestApi;
  public readonly analysisTable: dynamodb.Table;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // WAF Log Storage
    this.logBucket = new s3.Bucket(this, 'WafLogBucket', {
      bucketName: `waf-logs-v2-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          expiration: Duration.days(90),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
          ],
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
    });

    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });

    this.logBucket.grantWrite(firehoseRole);

    const logDeliveryStream = new kinesis.CfnDeliveryStream(this, 'WafLogDeliveryStream', {
      deliveryStreamName: 'aws-waf-logs-v2-delivery-stream',
      deliveryStreamType: 'DirectPut',
      s3DestinationConfiguration: {
        bucketArn: this.logBucket.bucketArn,
        prefix: 'waf-logs/',
        errorOutputPrefix: 'error-logs/',
        compressionFormat: 'GZIP',
        roleArn: firehoseRole.roleArn,
      },
    });

    // Basic WAF Configuration
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'WebACL',
      },
    });

    const loggingConfiguration = new wafv2.CfnLoggingConfiguration(this, 'WafLoggingConfig', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [logDeliveryStream.attrArn],
    });

    loggingConfiguration.addDependency(logDeliveryStream);

    // DynamoDB Table for Analysis Results
    this.analysisTable = new dynamodb.Table(this, 'AnalysisTable', {
      tableName: 'waf-analysis-results-v2',
      partitionKey: {
        name: 'analysisId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    // Lambda Execution Role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    this.logBucket.grantRead(lambdaRole);
    this.analysisTable.grantReadWriteData(lambdaRole);

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['arn:aws:bedrock:*:*:foundation-model/*'],
      }),
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['wafv2:*'],
        resources: ['*'],
      }),
    );

    // Lambda Functions
    const logAnalyzerLambda = new lambda.Function(this, 'LogAnalyzerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'log-analyzer.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/backend')),
      environment: {
        LOG_BUCKET_NAME: this.logBucket.bucketName,
        ANALYSIS_TABLE_NAME: this.analysisTable.tableName,
      },
      role: lambdaRole,
      timeout: Duration.minutes(5),
      memorySize: 1024,
    });

    const ruleManagerLambda = new lambda.Function(this, 'RuleManagerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'rule-manager.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/backend')),
      environment: {
        ANALYSIS_TABLE_NAME: this.analysisTable.tableName,
      },
      role: lambdaRole,
      timeout: Duration.minutes(2),
      memorySize: 512,
    });

    const aiAssistantLambda = new lambda.Function(this, 'AiAssistantFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'ai-assistant.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/backend')),
      environment: {
        ANALYSIS_TABLE_NAME: this.analysisTable.tableName,
        BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      },
      role: lambdaRole,
      timeout: Duration.minutes(5),
      memorySize: 1024,
    });

    // API Gateway
    this.api = new apigateway.RestApi(this, 'WafAnalyzerApi', {
      restApiName: 'WAF Analyzer API',
      description: 'API for WAF log analysis and rule management',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const apiKey = this.api.addApiKey('ApiKey', {
      apiKeyName: 'waf-analyzer-api-key-v2',
    });

    const usagePlan = this.api.addUsagePlan('UsagePlan', {
      name: 'Basic',
      apiStages: [
        {
          api: this.api,
          stage: this.api.deploymentStage,
        },
      ],
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
    });

    usagePlan.addApiKey(apiKey);

    // API Routes
    const logsResource = this.api.root.addResource('logs');
    logsResource.addMethod('POST', new apigateway.LambdaIntegration(logAnalyzerLambda), {
      apiKeyRequired: true,
    });
    logsResource.addMethod('GET', new apigateway.LambdaIntegration(logAnalyzerLambda), {
      apiKeyRequired: true,
    });

    const rulesResource = this.api.root.addResource('rules');
    rulesResource.addMethod('GET', new apigateway.LambdaIntegration(ruleManagerLambda), {
      apiKeyRequired: true,
    });
    rulesResource.addMethod('PUT', new apigateway.LambdaIntegration(ruleManagerLambda), {
      apiKeyRequired: true,
    });

    const aiResource = this.api.root.addResource('ai');
    aiResource.addMethod('POST', new apigateway.LambdaIntegration(aiAssistantLambda), {
      apiKeyRequired: true,
    });

    // Frontend CloudFront Distribution
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `waf-analyzer-frontend-v2-${this.account}-${this.region}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Use OAI for simplicity and compatibility
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for WAF Analyzer Frontend',
    });

    websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [websiteBucket.arnForObjects('*')],
        principals: [originAccessIdentity.grantPrincipal],
      }),
    );

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Outputs
    new CfnOutput(this, 'WebACLId', {
      value: this.webAcl.attrId,
      description: 'Web ACL ID',
    });

    new CfnOutput(this, 'LogBucketName', {
      value: this.logBucket.bucketName,
      description: 'WAF Log Bucket Name',
    });

    new CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Endpoint URL',
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: `https://${this.distribution.domainName}`,
      description: 'Frontend URL',
    });
  }
}