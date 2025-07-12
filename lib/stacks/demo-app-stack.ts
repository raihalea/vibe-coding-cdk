import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class DemoAppStack extends Stack {
  public readonly api: apigateway.RestApi;
  public readonly demoTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.demoTable = new dynamodb.Table(this, 'DemoTable', {
      tableName: 'demo-user-data',
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

    const lambdaRole = new iam.Role(this, 'DemoLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    this.demoTable.grantReadWriteData(lambdaRole);

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

    new CfnOutput(this, 'DemoApiUrl', {
      value: this.api.url,
      description: 'Demo Application API URL',
    });

    new CfnOutput(this, 'DemoWebsiteUrl', {
      value: `${this.api.url}`,
      description: 'Demo Website URL',
    });
  }
}