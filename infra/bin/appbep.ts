#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { SiteStack } from '../lib/site-stack';

const app = new App();

// Custom domain is opt-in so `cdk synth` works offline and no account/zone IDs live in git:
//   npx cdk deploy -c hostedZoneId=Z123...      (domain defaults to appbep.com)
const hostedZoneId = app.node.tryGetContext('hostedZoneId') as string | undefined;
const domainName = (app.node.tryGetContext('domainName') as string | undefined) ?? 'appbep.com';

new SiteStack(app, 'Appbep', {
  // CloudFront certificates must be in us-east-1, so the whole (small) stack lives there.
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  domain: hostedZoneId ? { domainName, hostedZoneId } : undefined,
});
