import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as kinesis from 'aws-cdk-lib/aws-kinesisfirehose';
import * as path from 'path';

interface DemoStackProps extends StackProps {
  logBucket: s3.Bucket;
}

export class DemoStack extends Stack {
  public readonly api: apigateway.RestApi;
  public readonly demoTable: dynamodb.Table;
  public readonly demoWebAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: DemoStackProps) {
    super(scope, id, props);

    // Demo Application DynamoDB Table
    this.demoTable = new dynamodb.Table(this, 'DemoTable', {
      tableName: 'demo-user-data-v2',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda Execution Role
    const lambdaRole = new iam.Role(this, 'DemoLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    this.demoTable.grantReadWriteData(lambdaRole);

    // Demo Lambda Functions
    const demoWebsiteLambda = new lambda.Function(this, 'DemoWebsiteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'demo-website.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/demo-backend')),
      environment: {
        DEMO_TABLE_NAME: this.demoTable.tableName,
      },
      role: lambdaRole,
      timeout: Duration.seconds(30),
      memorySize: 256,
    });

    const demoApiLambda = new lambda.Function(this, 'DemoApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'demo-api.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/demo-backend')),
      environment: {
        DEMO_TABLE_NAME: this.demoTable.tableName,
      },
      role: lambdaRole,
      timeout: Duration.seconds(30),
      memorySize: 256,
    });

    // Demo API Gateway
    this.api = new apigateway.RestApi(this, 'DemoApi', {
      restApiName: 'Demo Application API',
      description: 'Demo application for WAF testing',
      binaryMediaTypes: ['*/*'],
    });

    const websiteIntegration = new apigateway.LambdaIntegration(demoWebsiteLambda, {
      proxy: true,
    });

    const apiIntegration = new apigateway.LambdaIntegration(demoApiLambda, {
      proxy: true,
    });

    // API Routes
    this.api.root.addMethod('GET', websiteIntegration);
    this.api.root.addMethod('POST', websiteIntegration);

    const apiResource = this.api.root.addResource('api');
    
    const usersResource = apiResource.addResource('users');
    usersResource.addMethod('GET', apiIntegration);
    usersResource.addMethod('POST', apiIntegration);
    usersResource.addMethod('PUT', apiIntegration);
    usersResource.addMethod('DELETE', apiIntegration);

    const userResource = usersResource.addResource('{userId}');
    userResource.addMethod('GET', apiIntegration);
    userResource.addMethod('PUT', apiIntegration);
    userResource.addMethod('DELETE', apiIntegration);

    const loginResource = apiResource.addResource('login');
    loginResource.addMethod('POST', apiIntegration);

    const searchResource = apiResource.addResource('search');
    searchResource.addMethod('GET', apiIntegration);

    const adminResource = apiResource.addResource('admin');
    adminResource.addMethod('GET', apiIntegration);
    adminResource.addMethod('POST', apiIntegration);

    // Comprehensive WAF Configuration for Demo
    this.demoWebAcl = new wafv2.CfnWebACL(this, 'DemoWebACL', {
      name: 'DemoApplicationWAF',
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      description: 'WAF for demo application with comprehensive rules for testing',
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetric',
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
              excludedRules: [],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsMetric',
          },
        },
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
              excludedRules: [],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'SQLiRuleSetMetric',
          },
        },
        {
          name: 'RateLimitRule',
          priority: 4,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 100,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitMetric',
          },
        },
        {
          name: 'AdminPathProtection',
          priority: 5,
          action: { block: {} },
          statement: {
            andStatement: {
              statements: [
                {
                  byteMatchStatement: {
                    searchString: '/api/admin',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [
                      {
                        priority: 0,
                        type: 'LOWERCASE',
                      },
                    ],
                    positionalConstraint: 'STARTS_WITH',
                  },
                },
                {
                  notStatement: {
                    statement: {
                      ipSetReferenceStatement: {
                        arn: this.createTrustedIPSet(),
                      },
                    },
                  },
                },
              ],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AdminPathProtectionMetric',
          },
        },
        {
          name: 'SuspiciousUserAgentRule',
          priority: 6,
          action: { count: {} },
          statement: {
            orStatement: {
              statements: [
                {
                  byteMatchStatement: {
                    searchString: 'bot',
                    fieldToMatch: {
                      singleHeader: { name: 'user-agent' },
                    },
                    textTransformations: [
                      {
                        priority: 0,
                        type: 'LOWERCASE',
                      },
                    ],
                    positionalConstraint: 'CONTAINS',
                  },
                },
                {
                  byteMatchStatement: {
                    searchString: 'scanner',
                    fieldToMatch: {
                      singleHeader: { name: 'user-agent' },
                    },
                    textTransformations: [
                      {
                        priority: 0,
                        type: 'LOWERCASE',
                      },
                    ],
                    positionalConstraint: 'CONTAINS',
                  },
                },
                {
                  byteMatchStatement: {
                    searchString: 'crawler',
                    fieldToMatch: {
                      singleHeader: { name: 'user-agent' },
                    },
                    textTransformations: [
                      {
                        priority: 0,
                        type: 'LOWERCASE',
                      },
                    ],
                    positionalConstraint: 'CONTAINS',
                  },
                },
              ],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'SuspiciousUserAgentMetric',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'DemoWebACLMetric',
      },
    });

    // WAF Logging Configuration
    const firehoseRole = new iam.Role(this, 'DemoFirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });

    props.logBucket.grantWrite(firehoseRole);

    const demoLogDeliveryStream = new kinesis.CfnDeliveryStream(this, 'DemoWafLogDeliveryStream', {
      deliveryStreamName: 'aws-waf-logs-demo-delivery-stream',
      deliveryStreamType: 'DirectPut',
      s3DestinationConfiguration: {
        bucketArn: props.logBucket.bucketArn,
        prefix: 'demo-waf-logs/',
        errorOutputPrefix: 'demo-error-logs/',
        compressionFormat: 'GZIP',
        roleArn: firehoseRole.roleArn,
        bufferingHints: {
          sizeInMBs: 5,
          intervalInSeconds: 300,
        },
      },
    });

    const demoLoggingConfiguration = new wafv2.CfnLoggingConfiguration(this, 'DemoWafLoggingConfig', {
      resourceArn: this.demoWebAcl.attrArn,
      logDestinationConfigs: [demoLogDeliveryStream.attrArn],
      redactedFields: [
        {
          singleHeader: {
            Name: 'authorization',
          },
        },
        {
          singleHeader: {
            Name: 'cookie',
          },
        },
      ],
    });

    demoLoggingConfiguration.addDependency(demoLogDeliveryStream);

    // Associate WAF with API Gateway
    const webAclAssociation = new wafv2.CfnWebACLAssociation(this, 'DemoWebACLAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${this.api.deploymentStage.stageName}`,
      webAclArn: this.demoWebAcl.attrArn,
    });

    // Outputs
    new CfnOutput(this, 'DemoApiUrl', {
      value: this.api.url,
      description: 'Demo Application API URL',
    });

    new CfnOutput(this, 'DemoWebsiteUrl', {
      value: `${this.api.url}`,
      description: 'Demo Website URL',
    });

    new CfnOutput(this, 'DemoWebACLId', {
      value: this.demoWebAcl.attrId,
      description: 'Demo Web ACL ID',
    });

    new CfnOutput(this, 'DemoWebACLArn', {
      value: this.demoWebAcl.attrArn,
      description: 'Demo Web ACL ARN',
    });
  }

  private createTrustedIPSet(): string {
    const trustedIPSet = new wafv2.CfnIPSet(this, 'TrustedIPSet', {
      scope: 'REGIONAL',
      ipAddressVersion: 'IPV4',
      addresses: [
        '127.0.0.1/32',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
      ],
      description: 'Trusted IP addresses for admin access',
    });

    return trustedIPSet.attrArn;
  }
}