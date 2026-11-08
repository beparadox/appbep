import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MESSAGE_MAX, MESSAGE_MIN, NAME_MAX, siteKey } from './contactConfig';

/** The bits of Cloudflare's Turnstile script this page uses. */
interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<Turnstile> | null = null;

/** Loads Cloudflare's script once (it must come from Cloudflare; it can't be bundled). */
function loadTurnstile(): Promise<Turnstile> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('no turnstile'));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type Status =
  { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

const ERRORS: Record<string, string> = {
  invalid_name: 'Please add your name.',
  invalid_email: "That email address doesn't look right.",
  invalid_message: `Messages need ${MESSAGE_MIN}-${MESSAGE_MAX} characters.`,
  too_many_links: 'Please include at most two links.',
  verification_failed: 'The "are you human" check didn\'t go through. Please try again.',
  rate_limited: "That's the limit for today. Please try again tomorrow.",
  not_configured: "The contact form isn't open yet. Please check back soon.",
};
const FALLBACK_ERROR = "Something went wrong and your message wasn't sent. Please try again later.";

export default function Contact() {
  const startedAt = useRef(Date.now());
  const widgetEl = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [widgetFailed, setWidgetFailed] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !widgetEl.current) return;
        widgetId.current = turnstile.render(widgetEl.current, {
          sitekey: siteKey,
          action: 'contact',
          callback: (t: string) => setToken(t),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        });
      })
      .catch(() => {
        if (!cancelled) setWidgetFailed(true);
      });
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const field = (name: string) => String(form.get(name) ?? '');
    setStatus({ kind: 'sending' });
    let ok = false;
    let error = '';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: field('name'),
          email: field('email'),
          message: field('message'),
          website: field('website'),
          startedAt: startedAt.current,
          turnstileToken: token,
        }),
      });
      ok = res.status === 202;
      if (!ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        error = data?.error ?? '';
      }
    } catch {
      error = '';
    }
    if (ok) {
      setStatus({ kind: 'sent' });
      return;
    }
    setStatus({ kind: 'error', message: ERRORS[error] ?? FALLBACK_ERROR });
    // A Turnstile token works once; get a fresh one for the next try (unless it wasn't used).
    const tokenUsed = ![
      'invalid_name',
      'invalid_email',
      'invalid_message',
      'too_many_links',
    ].includes(error);
    if (tokenUsed && widgetId.current) {
      setToken('');
      window.turnstile?.reset(widgetId.current);
    }
  }

  return (
    <main className="home contact">
      <title>Contact · Bambridge E. Peterson</title>
      <h1>Contact</h1>

      {status.kind === 'sent' ? (
        <p role="status">Thanks! Your message is on its way. I'll reply by email.</p>
      ) : !siteKey ? (
        <p>The contact form isn&apos;t open yet. Please check back soon.</p>
      ) : (
        <form onSubmit={onSubmit} className="contact-form">
          <p className="tagline">Send me a message. I&apos;ll reply by email.</p>

          <label>
            Name
            <input name="name" required maxLength={NAME_MAX} autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            Message
            <textarea
              name="message"
              required
              minLength={MESSAGE_MIN}
              maxLength={MESSAGE_MAX}
              rows={7}
            />
          </label>

          {/* Honeypot: hidden from people (and screen readers); bots fill in every field. */}
          <div className="contact-honeypot" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <div ref={widgetEl} className="contact-turnstile" />
          {widgetFailed && (
            <p className="contact-error">
              The &quot;are you human&quot; check couldn&apos;t load. A blocker may be stopping
              challenges.cloudflare.com.
            </p>
          )}

          <button type="submit" disabled={!token || status.kind === 'sending'}>
            {status.kind === 'sending' ? 'Sending…' : 'Send'}
          </button>
          {status.kind === 'error' && (
            <p className="contact-error" role="alert">
              {status.message}
            </p>
          )}
        </form>
      )}

      <p>
        <Link to="/">Home</Link>
      </p>
    </main>
  );
}
