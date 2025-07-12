#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainAppStack } from '../lib/stacks/main-app-stack';
import { DemoStack } from '../lib/stacks/demo-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Main WAF log analysis application (consolidated WAF, API, Frontend)
const mainAppStack = new MainAppStack(app, 'WafAnalyzerMainStack', {
  env,
  description: 'Main WAF log analyzer application with dashboard and AI analysis',
});

// Demo application for WAF testing and log generation
const demoStack = new DemoStack(app, 'WafAnalyzerDemoStack', {
  env,
  logBucket: mainAppStack.logBucket,
  description: 'Demo application with comprehensive WAF protection for testing',
});

// Dependencies
demoStack.addDependency(mainAppStack);

app.synth();