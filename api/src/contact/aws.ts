/**
 * The real ContactDeps: SSM Parameter Store for the private settings, Cloudflare for
 * Turnstile, DynamoDB for the daily limit, SES for sending.
 *
 * Private settings live in SSM, never in git or in the Lambda's environment
 * (docs/tutorials/contact-form-setup.md shows how to set them):
 *   CONTACT_TO_PARAM        (String)        the inbox messages go to
 *   TURNSTILE_SECRET_PARAM  (SecureString)  the Turnstile widget's secret key
 */
import { createHmac } from 'node:crypto';
import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { LIMITS } from './contract';
import type { ContactDeps, Outgoing } from './service';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const CONFIG_TTL_MS = 5 * 60 * 1000;

interface Config {
  to: string;
  turnstileSecret: string;
}

export interface ContactEnv {
  TABLE_NAME?: string;
  CONTACT_FROM?: string;
  CONTACT_TO_PARAM?: string;
  TURNSTILE_SECRET_PARAM?: string;
}

/** One line for an email subject: no line breaks (header injection), not too long. */
export function subjectFor(name: string): string {
  const clean = name.replace(/[\r\n\t]+/g, ' ').slice(0, 60);
  return `appbep.com: message from ${clean}`;
}

export function bodyFor(mail: Outgoing): string {
  return [
    `From: ${mail.name} <${mail.email}>`,
    `Sent: ${mail.sentAt}`,
    '',
    mail.message,
    '',
    '--',
    'Sent from the contact form on appbep.com. Reply to this email to answer them.',
  ].join('\n');
}

/**
 * The visitor's IP. CloudFront puts it in `cloudfront-viewer-address` ("ip:port", and an
 * IPv6 ip has colons of its own). API Gateway's sourceIp would be CloudFront's address.
 */
export function viewerIp(headers: Record<string, string | undefined>, sourceIp: string): string {
  const addr = headers['cloudfront-viewer-address'];
  if (addr && addr.lastIndexOf(':') > 0) return addr.slice(0, addr.lastIndexOf(':'));
  return sourceIp;
}

export function createContactDeps(env: ContactEnv): ContactDeps {
  const ssm = new SSMClient({});
  const ses = new SESv2Client({});
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  let cached: { config: Config | null; at: number } | null = null;

  async function config(): Promise<Config | null> {
    if (cached && Date.now() - cached.at < CONFIG_TTL_MS) return cached.config;
    let found: Config | null = null;
    if (env.CONTACT_TO_PARAM && env.TURNSTILE_SECRET_PARAM && env.CONTACT_FROM) {
      const res = await ssm.send(
        new GetParametersCommand({
          Names: [env.CONTACT_TO_PARAM, env.TURNSTILE_SECRET_PARAM],
          WithDecryption: true,
        }),
      );
      const value = (name: string) => res.Parameters?.find((p) => p.Name === name)?.Value;
      const to = value(env.CONTACT_TO_PARAM);
      const turnstileSecret = value(env.TURNSTILE_SECRET_PARAM);
      if (to && turnstileSecret) found = { to, turnstileSecret };
    }
    cached = { config: found, at: Date.now() };
    return found;
  }

  return {
    now: Date.now,

    isConfigured: async () => (await config()) !== null,

    verifyTurnstile: async (token, ip) => {
      const c = await config();
      if (!c) return false;
      const form = new URLSearchParams({
        secret: c.turnstileSecret,
        response: token,
        remoteip: ip,
      });
      try {
        const res = await fetch(SITEVERIFY, {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(4000),
        });
        const data = (await res.json()) as { success?: boolean };
        return data.success === true;
      } catch (err) {
        console.error('contact: turnstile verify failed', err);
        return false;
      }
    },

    allowAnother: async (ip, day) => {
      const c = await config();
      if (!c || !env.TABLE_NAME) return false;
      // Store a keyed hash, not the IP: the key (the Turnstile secret) never leaves AWS, so
      // the table alone can't be used to look up who wrote.
      const visitor = createHmac('sha256', c.turnstileSecret).update(`${ip}|${day}`).digest('hex');
      try {
        await db.send(
          new UpdateCommand({
            TableName: env.TABLE_NAME,
            Key: { pk: `CONTACT#RATE#${visitor}`, sk: day },
            UpdateExpression: 'ADD #count :one SET #ttl = :ttl',
            ConditionExpression: 'attribute_not_exists(#count) OR #count < :max',
            ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
            ExpressionAttributeValues: {
              ':one': 1,
              ':max': LIMITS.MAX_PER_DAY,
              ':ttl': Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
            },
          }),
        );
        return true;
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) return false;
        throw err;
      }
    },

    send: async (mail) => {
      const c = await config();
      if (!c || !env.CONTACT_FROM) throw new Error('contact form not configured');
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: env.CONTACT_FROM,
          Destination: { ToAddresses: [c.to] },
          ReplyToAddresses: [mail.email],
          Content: {
            Simple: {
              Subject: { Data: subjectFor(mail.name), Charset: 'UTF-8' },
              Body: { Text: { Data: bodyFor(mail), Charset: 'UTF-8' } },
            },
          },
        }),
      );
    },
  };
}
