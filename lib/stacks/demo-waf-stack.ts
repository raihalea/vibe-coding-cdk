import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesisfirehose';

interface DemoWafStackProps extends StackProps {
  demoApi: apigateway.RestApi;
  logBucket: s3.Bucket;
}

export class DemoWafStack extends Stack {
  public readonly demoWebAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: DemoWafStackProps) {
    super(scope, id, props);

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

    const webAclAssociation = new wafv2.CfnWebACLAssociation(this, 'DemoWebACLAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${props.demoApi.restApiId}/stages/${props.demoApi.deploymentStage.stageName}`,
      webAclArn: this.demoWebAcl.attrArn,
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