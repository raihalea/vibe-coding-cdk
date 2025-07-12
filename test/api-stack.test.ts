import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ApiStack } from '../lib/stacks/api-stack';

describe('ApiStack', () => {
  let app: cdk.App;
  let mockLogBucket: s3.Bucket;
  let stack: ApiStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    
    // Create a mock S3 bucket for testing
    const mockStack = new cdk.Stack(app, 'MockStack');
    mockLogBucket = new s3.Bucket(mockStack, 'MockLogBucket');
    
    stack = new ApiStack(app, 'TestApiStack', {
      logBucket: mockLogBucket,
    });
    template = Template.fromStack(stack);
  });

  test('creates DynamoDB table for analysis results', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'waf-analysis-results',
      KeySchema: [
        {
          AttributeName: 'analysisId',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'timestamp',
          KeyType: 'RANGE',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
    });
  });

  test('creates Lambda functions for log analysis', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'log-analyzer.handler',
      Runtime: 'nodejs20.x',
      MemorySize: 1024,
      Timeout: 300,
    });
  });

  test('creates Lambda function for rule management', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'rule-manager.handler',
      Runtime: 'nodejs20.x',
      MemorySize: 512,
      Timeout: 120,
    });
  });

  test('creates Lambda function for AI assistant', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'ai-assistant.handler',
      Runtime: 'nodejs20.x',
      MemorySize: 1024,
      Timeout: 300,
    });
  });

  test('creates API Gateway with correct endpoints', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'WAF Analyzer API',
      Description: 'API for WAF log analysis and rule management',
    });
  });

  test('creates API key and usage plan', () => {
    template.hasResourceProperties('AWS::ApiGateway::ApiKey', {
      Name: 'waf-analyzer-api-key',
    });

    template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
      UsagePlanName: 'Basic',
      Throttle: {
        RateLimit: 100,
        BurstLimit: 200,
      },
    });
  });

  test('creates IAM role with correct permissions', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          },
        ],
      },
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
            ],
          ],
        },
      ],
    });
  });

  test('grants Bedrock access to Lambda role', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          expect.objectContaining({
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            Effect: 'Allow',
            Resource: ['arn:aws:bedrock:*:*:foundation-model/*'],
          }),
        ]),
      },
    });
  });

  test('grants WAF access to Lambda role', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          expect.objectContaining({
            Action: ['wafv2:*'],
            Effect: 'Allow',
            Resource: ['*'],
          }),
        ]),
      },
    });
  });
});