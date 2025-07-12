import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

interface ApiStackProps extends StackProps {
  logBucket: s3.Bucket;
}

export class ApiStack extends Stack {
  public readonly api: apigateway.RestApi;
  public readonly analysisTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.analysisTable = new dynamodb.Table(this, 'AnalysisTable', {
      tableName: 'waf-analysis-results',
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

    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    props.logBucket.grantRead(lambdaRole);
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

    const logAnalyzerLambda = new lambda.Function(this, 'LogAnalyzerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'log-analyzer.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/backend')),
      environment: {
        LOG_BUCKET_NAME: props.logBucket.bucketName,
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
      apiKeyName: 'waf-analyzer-api-key',
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
  }
}