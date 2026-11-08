/**
 * The contact form API: what the browser sends and what it gets back.
 * The page that speaks it: web/src/pages/Contact.tsx.
 *
 *   POST /api/contact   (ContactRequest)   -> 202 { ok: true }
 *
 * Anti-spam, all checked on the server (docs/PLAN.md, "Contact form"):
 *   1. honeypot: `website` is a field people never see; if it's filled in, a bot did it
 *   2. fill time: sent less than MIN_FILL_MS after the form appeared -> a bot
 *      (1 and 2 get a fake 202, so the bot learns nothing)
 *   3. content limits below
 *   4. Cloudflare Turnstile: `turnstileToken` must verify with Cloudflare
 *   5. at most MAX_PER_DAY messages per visitor (hashed IP) per UTC day
 */

export interface ContactRequest {
  name: string;
  /** The visitor's address; replies go here. */
  email: string;
  message: string;
  /** Honeypot. Must be empty. */
  website: string;
  /** When the form appeared, epoch ms (the browser's clock). */
  startedAt: number;
  /** From the Turnstile widget. */
  turnstileToken: string;
}

export type ContactError =
  | 'invalid_request' // 400 not JSON / missing or wrong-type fields
  | 'invalid_name' // 400
  | 'invalid_email' // 400
  | 'invalid_message' // 400 too short or too long
  | 'too_many_links' // 400
  | 'verification_failed' // 403 Turnstile said no (or the token expired)
  | 'rate_limited' // 429
  | 'not_configured' // 503 the inbox or Turnstile secret isn't set up in AWS yet
  | 'send_failed'; // 502 SES refused or failed

export const LIMITS = {
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  MESSAGE_MIN: 10,
  MESSAGE_MAX: 5000,
  MAX_LINKS: 2,
  MIN_FILL_MS: 3000,
  MAX_PER_DAY: 3,
} as const;
