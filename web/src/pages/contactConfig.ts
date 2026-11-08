/**
 * Contact form settings that are safe to publish.
 *
 * TURNSTILE_SITE_KEY is the PUBLIC half of the Cloudflare Turnstile widget (the secret half
 * lives only in AWS SSM). Paste yours here: docs/tutorials/contact-form-setup.md, step 2.
 * While it's empty, the production site shows "not open yet" instead of the form.
 */
export const TURNSTILE_SITE_KEY = '';

/**
 * Cloudflare's published test key: always passes, shows a "testing only" widget. Used by the
 * dev server so the form works locally. Docs: developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

export const siteKey = import.meta.env.DEV ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY;

/** Same limits as the API (api/src/contact/contract.ts). */
export const NAME_MAX = 100;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;
