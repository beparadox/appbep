import * as path from 'node:path';
import * as fs from 'node:fs';
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as triggers from 'aws-cdk-lib/triggers';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { VIEWER_REQUEST_CODE } from './viewer-request';

export interface SiteStackProps extends StackProps {
  /** When omitted, the site is served from the default *.cloudfront.net domain. */
  domain?: { domainName: string; hostedZoneId: string };
}

const REPO_ROOT = path.join(__dirname, '..', '..');

/**
 * Contact form settings that must stay out of git live in SSM Parameter Store under this
 * prefix. You create them by hand (docs/tutorials/contact-form-setup.md); the stack only
 * lets the Lambda read them.
 */
export const CONTACT_PARAMS = {
  to: '/appbep/contact/to',
  turnstile: '/appbep/contact/turnstile-secret',
} as const;

/**
 * Key for hashing visitor IPs (quiz vote dedupe). A random value you create by hand
 * (docs/tutorials/schportz-setup.md); without it, votes answer "not configured".
 */
export const HASH_KEY_PARAM = '/appbep/hash-key';

export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    // ---------- Data: one on-demand table for scores + quiz votes ----------
    const table = new dynamodb.TableV2(this, 'Table', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // ---------- API: one Lambda behind an HTTP API ----------
    const fn = new nodejs.NodejsFunction(this, 'ApiFn', {
      entry: path.join(REPO_ROOT, 'api', 'src', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      // The contact form waits on SSM, Cloudflare and SES, one after another.
      timeout: Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName,
        // Empty without a domain: the contact form then answers "not configured".
        CONTACT_FROM: props.domain
          ? `appbep.com contact form <contact-form@${props.domain.domainName}>`
          : '',
        CONTACT_TO_PARAM: CONTACT_PARAMS.to,
        TURNSTILE_SECRET_PARAM: CONTACT_PARAMS.turnstile,
        HASH_KEY_PARAM,
      },
      logGroup: new logs.LogGroup(this, 'ApiLogs', {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      bundling: { format: nodejs.OutputFormat.ESM, minify: true, sourceMap: true },
    });
    table.grantReadWriteData(fn);

    // Contact form: read its two settings, and send email from this account's SES identities.
    // (A SecureString encrypted with the default aws/ssm key needs no extra KMS permission.)
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameters'],
        resources: Object.values(CONTACT_PARAMS).map((name) =>
          this.formatArn({ service: 'ssm', resource: 'parameter', resourceName: name.slice(1) }),
        ),
      }),
    );
    // Quiz votes: read the hashing key.
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          this.formatArn({
            service: 'ssm',
            resource: 'parameter',
            resourceName: HASH_KEY_PARAM.slice(1),
          }),
        ],
      }),
    );
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail'],
        resources: [this.formatArn({ service: 'ses', resource: 'identity', resourceName: '*' })],
      }),
    );

    const api = new apigw.HttpApi(this, 'HttpApi', {
      defaultIntegration: new HttpLambdaIntegration('ApiIntegration', fn),
    });
    // Throttle the whole API: cheap protection against abuse and surprise bills.
    const stage = api.defaultStage?.node.defaultChild as apigw.CfnStage;
    stage.defaultRouteSettings = { throttlingRateLimit: 10, throttlingBurstLimit: 20 };

    // ---------- Static site ----------
    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // SPA fallback for app routes + folder index for /exhibits/ (see viewer-request.ts).
    const spaRewrite = new cloudfront.Function(this, 'SpaRewrite', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(VIEWER_REQUEST_CODE),
    });

    let certificate: acm.ICertificate | undefined;
    let zone: route53.IPublicHostedZone | undefined;
    const names: string[] = [];
    if (props.domain) {
      const { domainName, hostedZoneId } = props.domain;
      zone = route53.PublicHostedZone.fromPublicHostedZoneAttributes(this, 'Zone', {
        hostedZoneId,
        zoneName: domainName,
      });
      names.push(domainName, `www.${domainName}`);
      certificate = new acm.Certificate(this, 'Cert', {
        domainName,
        subjectAlternativeNames: [`www.${domainName}`],
        validation: acm.CertificateValidation.fromDns(zone),
      });
    }

    const distribution = new cloudfront.Distribution(this, 'Cdn', {
      defaultRootObject: 'index.html',
      domainNames: names.length ? names : undefined,
      certificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        functionAssociations: [
          { function: spaRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
      additionalBehaviors: {
        'api/*': {
          origin: new origins.HttpOrigin(
            `${api.apiId}.execute-api.${this.region}.${this.urlSuffix}`,
          ),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    });

    if (zone && props.domain) {
      // Lets SES send as anything@appbep.com. CDK adds the three DKIM records to the zone,
      // which is what proves to Gmail that the mail really comes from this domain.
      new ses.EmailIdentity(this, 'MailDomain', {
        identity: ses.Identity.publicHostedZone(zone),
      });
      // DMARC in monitor-only mode: tells receivers the domain signs its mail (DKIM above).
      new route53.TxtRecord(this, 'Dmarc', {
        zone,
        recordName: `_dmarc.${props.domain.domainName}`,
        values: ['v=DMARC1; p=none'],
      });

      const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution));
      for (const recordName of [props.domain.domainName, `www.${props.domain.domainName}`]) {
        new route53.ARecord(this, `A-${recordName}`, { zone, recordName, target });
        new route53.AaaaRecord(this, `AAAA-${recordName}`, { zone, recordName, target });
      }
    }

    // Upload the built site if it exists (run `npm run build` first).
    const dist = path.join(REPO_ROOT, 'web', 'dist');
    let siteDeployment: s3deploy.BucketDeployment | undefined;
    if (fs.existsSync(dist)) {
      siteDeployment = new s3deploy.BucketDeployment(this, 'DeploySite', {
        sources: [s3deploy.Source.asset(dist)],
        destinationBucket: bucket,
        distribution,
        distributionPaths: ['/*'],
        // The feed reader writes these; a deploy must not delete them.
        exclude: ['feeds/*'],
      });
    }

    // ---------- Exhibit headlines: fetched every 30 minutes, saved as static files under feeds/ ----------
    const feedsFn = new nodejs.NodejsFunction(this, 'FeedsFn', {
      entry: path.join(REPO_ROOT, 'api', 'src', 'feeds', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(30),
      environment: { BUCKET: bucket.bucketName },
      logGroup: new logs.LogGroup(this, 'FeedsLogs', {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      bundling: { format: nodejs.OutputFormat.ESM, minify: true, sourceMap: true },
    });
    bucket.grantRead(feedsFn, 'feeds/*');
    bucket.grantPut(feedsFn, 'feeds/*');
    new events.Rule(this, 'FeedsSchedule', {
      schedule: events.Schedule.rate(Duration.minutes(30)),
      targets: [new eventTargets.LambdaFunction(feedsFn)],
    });
    // Also run once right after a deploy, so the page has headlines straight away.
    new triggers.Trigger(this, 'FeedsAfterDeploy', {
      handler: feedsFn,
      executeAfter: siteDeployment ? [siteDeployment] : [],
    });

    new CfnOutput(this, 'SiteUrl', {
      value: `https://${names[0] ?? distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'TableName', { value: table.tableName });
  }
}
