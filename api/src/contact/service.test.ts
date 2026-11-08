import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContactRequest } from './contract';
import { bodyFor, subjectFor, viewerIp } from './aws';
import { parseContact, submitContact, type ContactDeps, type Outgoing } from './service';

const NOW = Date.UTC(2026, 10, 8, 15, 0, 0);

const good = (over: Partial<ContactRequest> = {}): ContactRequest => ({
  name: 'Ada',
  email: 'ada@example.com',
  message: 'Hello there, I liked the funhouse.',
  website: '',
  startedAt: NOW - 60_000,
  turnstileToken: 'tok',
  ...over,
});

let sent: Outgoing[];
let counts: Map<string, number>;
let deps: ContactDeps;

beforeEach(() => {
  sent = [];
  counts = new Map();
  deps = {
    now: () => NOW,
    isConfigured: async () => true,
    verifyTurnstile: vi.fn(async (token: string) => token === 'tok'),
    allowAnother: async (ip, day) => {
      const key = `${ip}|${day}`;
      const n = counts.get(key) ?? 0;
      if (n >= 3) return false;
      counts.set(key, n + 1);
      return true;
    },
    send: async (mail) => {
      sent.push(mail);
    },
  };
});

const submit = (body: unknown, ip = '203.0.113.7') => submitContact(deps, JSON.stringify(body), ip);

describe('parseContact', () => {
  it('trims and accepts a normal message', () => {
    const r = parseContact(
      JSON.stringify(good({ name: '  Ada ', message: '  Hello there, friend.  ' })),
    );
    expect(r).toEqual({ value: good({ name: 'Ada', message: 'Hello there, friend.' }) });
  });
  it('rejects bodies that are not the right shape', () => {
    for (const body of [
      undefined,
      '',
      '{nope',
      'null',
      '[]',
      JSON.stringify({ ...good(), startedAt: '1' }),
    ]) {
      expect(parseContact(body)).toEqual({ error: 'invalid_request' });
    }
    const { email: _email, ...noEmail } = good();
    expect(parseContact(JSON.stringify(noEmail))).toEqual({ error: 'invalid_request' });
  });
  it('checks name, email, message length and links', () => {
    const err = (over: Partial<ContactRequest>) => parseContact(JSON.stringify(good(over)));
    expect(err({ name: '   ' })).toEqual({ error: 'invalid_name' });
    expect(err({ name: 'x'.repeat(101) })).toEqual({ error: 'invalid_name' });
    expect(err({ name: 'Ada\nBcc: x@y.z' })).toEqual({ error: 'invalid_name' });
    for (const email of [
      'ada',
      'ada@example',
      'a da@example.com',
      '<a@b.com>',
      'a@b.com, c@d.com',
    ]) {
      expect(err({ email })).toEqual({ error: 'invalid_email' });
    }
    expect(err({ email: 'ada.lovelace+site@mail.example.co.uk' })).toHaveProperty('value');
    expect(err({ message: 'hi' })).toEqual({ error: 'invalid_message' });
    expect(err({ message: 'x'.repeat(5001) })).toEqual({ error: 'invalid_message' });
    expect(err({ message: 'see https://a.com and http://b.com' })).toHaveProperty('value');
    expect(err({ message: 'see https://a.com and http://b.com and www.c.com' })).toEqual({
      error: 'too_many_links',
    });
  });
});

describe('submitContact', () => {
  it('sends a good message with the visitor as the reply-to', async () => {
    expect(await submit(good())).toEqual({ status: 202, body: { ok: true } });
    expect(sent).toEqual([
      {
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello there, I liked the funhouse.',
        sentAt: '2026-11-08T15:00:00.000Z',
      },
    ]);
  });

  it('fakes success for the honeypot and for forms filled too fast, and sends nothing', async () => {
    expect(await submit(good({ website: 'http://spam.example' }))).toEqual({
      status: 202,
      body: { ok: true },
    });
    expect(await submit(good({ startedAt: NOW - 1000 }))).toEqual({
      status: 202,
      body: { ok: true },
    });
    expect(sent).toEqual([]);
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("checks the content before spending the visitor's Turnstile token", async () => {
    expect((await submit(good({ email: 'nope' }))).status).toBe(400);
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('refuses a failed or missing Turnstile check', async () => {
    expect(await submit(good({ turnstileToken: 'bad' }))).toEqual({
      status: 403,
      body: { error: 'verification_failed' },
    });
    expect((await submit(good({ turnstileToken: '' }))).status).toBe(403);
    expect(sent).toEqual([]);
  });

  it('allows 3 messages per visitor per day', async () => {
    for (let i = 0; i < 3; i += 1) expect((await submit(good())).status).toBe(202);
    expect(await submit(good())).toEqual({ status: 429, body: { error: 'rate_limited' } });
    expect((await submit(good(), '198.51.100.1')).status).toBe(202);
    expect(sent).toHaveLength(4);
  });

  it('says so when the inbox or secret is not set up yet', async () => {
    deps.isConfigured = async () => false;
    expect(await submit(good())).toEqual({ status: 503, body: { error: 'not_configured' } });
  });

  it('reports a sending failure', async () => {
    deps.send = async () => {
      throw new Error('SES says no');
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await submit(good())).toEqual({ status: 502, body: { error: 'send_failed' } });
  });
});

describe('email helpers', () => {
  it('keeps the subject on one line', () => {
    expect(subjectFor('Ada\r\nBcc: x@y.z')).toBe('appbep.com: message from Ada Bcc: x@y.z');
    expect(subjectFor('x'.repeat(200)).length).toBeLessThan(90);
  });
  it('puts who wrote and when at the top of the body', () => {
    const body = bodyFor({ name: 'Ada', email: 'ada@example.com', message: 'Hi!', sentAt: 'T' });
    expect(body.split('\n').slice(0, 4)).toEqual([
      'From: Ada <ada@example.com>',
      'Sent: T',
      '',
      'Hi!',
    ]);
  });
  it("finds the visitor's IP behind CloudFront, IPv4 and IPv6", () => {
    expect(viewerIp({ 'cloudfront-viewer-address': '203.0.113.7:51234' }, '10.0.0.1')).toBe(
      '203.0.113.7',
    );
    expect(viewerIp({ 'cloudfront-viewer-address': '2001:db8::1:443' }, '10.0.0.1')).toBe(
      '2001:db8::1',
    );
    expect(viewerIp({}, '10.0.0.1')).toBe('10.0.0.1');
  });
});
