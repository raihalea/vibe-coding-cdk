import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesisfirehose';

export class WafStack extends Stack {
  public readonly logBucket: s3.Bucket;
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.logBucket = new s3.Bucket(this, 'WafLogBucket', {
      bucketName: `waf-logs-${this.account}-${this.region}`,
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
      deliveryStreamName: 'aws-waf-logs-delivery-stream',
      deliveryStreamType: 'DirectPut',
      s3DestinationConfiguration: {
        bucketArn: this.logBucket.bucketArn,
        prefix: 'waf-logs/',
        errorOutputPrefix: 'error-logs/',
        compressionFormat: 'GZIP',
        roleArn: firehoseRole.roleArn,
      },
    });

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

    new CfnOutput(this, 'WebACLId', {
      value: this.webAcl.attrId,
      description: 'Web ACL ID',
    });

    new CfnOutput(this, 'LogBucketName', {
      value: this.logBucket.bucketName,
      description: 'WAF Log Bucket Name',
    });
  }
}