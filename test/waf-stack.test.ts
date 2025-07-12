import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { WafStack } from '../lib/stacks/waf-stack';

describe('WafStack', () => {
  let app: cdk.App;
  let stack: WafStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new WafStack(app, 'TestWafStack');
    template = Template.fromStack(stack);
  });

  test('creates S3 bucket for WAF logs', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('creates Kinesis Firehose delivery stream', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      DeliveryStreamType: 'DirectPut',
    });
  });

  test('creates WAF Web ACL with rate limiting rule', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'REGIONAL',
      DefaultAction: {
        Allow: {},
      },
      Rules: [
        {
          Name: 'RateLimitRule',
          Priority: 1,
          Action: {
            Block: {},
          },
          Statement: {
            RateBasedStatement: {
              Limit: 2000,
              AggregateKeyType: 'IP',
            },
          },
        },
      ],
    });
  });

  test('creates WAF logging configuration', () => {
    template.hasResourceProperties('AWS::WAFv2::LoggingConfiguration', {
      ResourceArn: {
        'Fn::GetAtt': [expect.stringMatching(/WebACL/), 'Arn'],
      },
    });
  });

  test('creates IAM role for Firehose with correct permissions', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'firehose.amazonaws.com',
            },
          },
        ],
      },
    });
  });

  test('outputs Web ACL ID and log bucket name', () => {
    template.hasOutput('WebACLId', {});
    template.hasOutput('LogBucketName', {});
  });
});