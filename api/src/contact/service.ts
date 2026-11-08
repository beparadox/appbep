/**
 * Handles one contact form submission. No AWS or network code here: everything outside
 * (Cloudflare, DynamoDB, SES, the clock) comes in through `ContactDeps`, so tests can fake it.
 * The real deps are in aws.ts.
 */
import { LIMITS, type ContactError, type ContactRequest } from './contract';

export interface Outgoing {
  name: string;
  email: string;
  message: string;
  sentAt: string;
}

export interface ContactDeps {
  now: () => number;
  /** False when the inbox address or Turnstile secret isn't set up yet. */
  isConfigured: () => Promise<boolean>;
  verifyTurnstile: (token: string, ip: string) => Promise<boolean>;
  /** Counts one message for this visitor today; false if they're over the limit. */
  allowAnother: (ip: string, day: string) => Promise<boolean>;
  send: (mail: Outgoing) => Promise<void>;
}

export interface Reply {
  status: number;
  body: unknown;
}

const ok: Reply = { status: 202, body: { ok: true } };
const fail = (status: number, error: ContactError): Reply => ({ status, body: { error } });

// Deliberately simple: something@something.tld, no spaces. SES rejects the rest.
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
const LINK = /https?:\/\/|www\./gi;

type Parsed = { value: ContactRequest } | { error: ContactError };

/** Shape and content checks. Trims name, email and message. */
export function parseContact(body: string | undefined): Parsed {
  let data: unknown;
  try {
    data = JSON.parse(body ?? '');
  } catch {
    return { error: 'invalid_request' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { error: 'invalid_request' };
  }
  const d = data as Record<string, unknown>;
  const strings = ['name', 'email', 'message', 'website', 'turnstileToken'] as const;
  if (strings.some((k) => typeof d[k] !== 'string') || typeof d.startedAt !== 'number') {
    return { error: 'invalid_request' };
  }
  const value: ContactRequest = {
    name: (d.name as string).trim(),
    email: (d.email as string).trim(),
    message: (d.message as string).trim(),
    website: d.website as string,
    startedAt: d.startedAt,
    turnstileToken: d.turnstileToken as string,
  };
  if (!value.name || value.name.length > LIMITS.NAME_MAX || /[\r\n]/.test(value.name)) {
    return { error: 'invalid_name' };
  }
  if (value.email.length > LIMITS.EMAIL_MAX || !EMAIL.test(value.email)) {
    return { error: 'invalid_email' };
  }
  if (value.message.length < LIMITS.MESSAGE_MIN || value.message.length > LIMITS.MESSAGE_MAX) {
    return { error: 'invalid_message' };
  }
  if ((value.message.match(LINK) ?? []).length > LIMITS.MAX_LINKS) {
    return { error: 'too_many_links' };
  }
  return { value };
}

/**
 * POST /api/contact. The order matters:
 *  - cheap checks first, and before Turnstile, because a Turnstile token works only once:
 *    a visitor who fixes a typo shouldn't have to do the check again
 *  - the daily limit only counts messages that passed everything else
 */
export async function submitContact(
  deps: ContactDeps,
  body: string | undefined,
  ip: string,
): Promise<Reply> {
  const parsed = parseContact(body);
  if ('error' in parsed) return fail(400, parsed.error);
  const msg = parsed.value;

  const now = deps.now();
  // Bots: pretend it worked.
  if (msg.website !== '') return ok;
  if (now - msg.startedAt < LIMITS.MIN_FILL_MS) return ok;

  if (!(await deps.isConfigured())) return fail(503, 'not_configured');
  if (!msg.turnstileToken || !(await deps.verifyTurnstile(msg.turnstileToken, ip))) {
    return fail(403, 'verification_failed');
  }
  const sentAt = new Date(now).toISOString();
  if (!(await deps.allowAnother(ip, sentAt.slice(0, 10)))) return fail(429, 'rate_limited');

  try {
    await deps.send({ name: msg.name, email: msg.email, message: msg.message, sentAt });
  } catch (err) {
    console.error('contact: send failed', err);
    return fail(502, 'send_failed');
  }
  return ok;
}
