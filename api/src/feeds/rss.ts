/**
 * Just enough RSS 2.0 parsing for headlines: each <item>'s title, link and pubDate.
 * (Every feed in sources.ts is RSS 2.0. No dependency needed for three fields.)
 * Output is plain text and http(s) links only; the page still inserts it as text.
 */

export interface Headline {
  title: string;
  link: string;
  /** ISO 8601, or null if the feed's date was missing or unreadable. */
  published: string | null;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  eacute: 'é',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** The text inside the first <tag>...</tag> in `xml`, CDATA unwrapped, tags removed. */
function field(xml: string, tag: string): string {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  if (!m?.[1]) return '';
  let text = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Decode first: some feeds escape their HTML (&lt;b&gt;), then remove any tags.
  text = decodeEntities(text).replace(/<[^>]*>/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

function safeLink(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseRss(xml: string, limit: number): Headline[] {
  const out: Headline[] = [];
  for (const m of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const item = m[1] ?? '';
    const title = field(item, 'title');
    const link = safeLink(field(item, 'link') || field(item, 'guid'));
    if (!title || !link) continue;
    const date = new Date(field(item, 'pubDate'));
    out.push({ title, link, published: Number.isNaN(date.getTime()) ? null : date.toISOString() });
    if (out.length >= limit) break;
  }
  return out;
}
