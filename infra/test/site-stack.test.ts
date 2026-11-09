import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { SiteStack } from '../lib/site-stack';

const synth = (domain?: { domainName: string; hostedZoneId: string }) =>
  Template.fromStack(new SiteStack(new App(), 'Test', { env: { region: 'us-east-1' }, domain }));

describe('SiteStack', () => {
  const t = synth();

  it('keeps the bucket private', () => {
    t.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: Match.objectLike({
        BlockPublicAcls: true,
        RestrictPublicBuckets: true,
      }),
    });
  });

  it('uses an on-demand table with TTL', () => {
    t.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
    });
  });

  it('throttles the API', () => {
    t.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      DefaultRouteSettings: { ThrottlingRateLimit: 10, ThrottlingBurstLimit: 20 },
    });
  });

  it('only creates DNS + cert when a hosted zone is given', () => {
    t.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    const withDomain = synth({ domainName: 'appbep.com', hostedZoneId: 'ZTEST' });
    withDomain.resourceCountIs('AWS::CertificateManager::Certificate', 1);
    // A + AAAA for two names, three DKIM CNAMEs, one DMARC TXT
    expect(Object.keys(withDomain.findResources('AWS::Route53::RecordSet')).length).toBe(8);
    withDomain.resourceCountIs('AWS::SES::EmailIdentity', 1);
    t.resourceCountIs('AWS::SES::EmailIdentity', 0);
  });

  it('refreshes the headlines every 30 minutes', () => {
    t.hasResourceProperties('AWS::Events::Rule', { ScheduleExpression: 'rate(30 minutes)' });
    t.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Timeout: 30,
      Environment: { Variables: { BUCKET: Match.anyValue() } },
    });
  });

  it('lets the API read only the contact settings and send email', () => {
    const withDomain = synth({ domainName: 'appbep.com', hostedZoneId: 'ZTEST' });
    withDomain.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          CONTACT_FROM: 'appbep.com contact form <contact-form@appbep.com>',
          CONTACT_TO_PARAM: '/appbep/contact/to',
        }),
      },
    });
    withDomain.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Action: 'ssm:GetParameters' }),
          Match.objectLike({ Action: 'ses:SendEmail' }),
        ]),
      },
    });
  });
});
