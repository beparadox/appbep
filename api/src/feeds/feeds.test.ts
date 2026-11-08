import { describe, expect, it } from 'vitest';
import { refreshFeeds, type FeedsFile } from './refresh';
import { parseRss } from './rss';

// Made-up feed in the shapes real feeds use: CDATA, entities, escaped HTML, a bad link.
const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Sports</title><link>https://example.com</link>
  <item>
    <title><![CDATA[Packers win 31&ndash;17 <b>at Lambeau</b>]]></title>
    <link>https://example.com/story-1?a=1&amp;b=2</link>
    <pubDate>Sun, 08 Nov 2026 18:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Bears &amp; Lions: &quot;It&#39;s a rivalry&quot; &#x2014; coach</title>
    <link>  https://example.com/story-2  </link>
    <pubDate>not a date</pubDate>
  </item>
  <item><title>Sneaky</title><link>javascript:alert(1)</link></item>
  <item><title></title><link>https://example.com/untitled</link></item>
  <item><title>From guid</title><guid isPermaLink="true">https://example.com/story-3</guid></item>
  <item><title>&lt;img src=x onerror=alert(1)&gt;Escaped tags</title><link>https://example.com/4</link></item>
</channel></rss>`;

describe('parseRss', () => {
  it('pulls out plain-text titles, safe links and dates', () => {
    expect(parseRss(RSS, 10)).toEqual([
      {
        title: 'Packers win 31–17 at Lambeau',
        link: 'https://example.com/story-1?a=1&b=2',
        published: '2026-11-08T18:00:00.000Z',
      },
      {
        title: 'Bears & Lions: "It\'s a rivalry" — coach',
        link: 'https://example.com/story-2',
        published: null,
      },
      { title: 'From guid', link: 'https://example.com/story-3', published: null },
      { title: 'Escaped tags', link: 'https://example.com/4', published: null },
    ]);
  });
  it('stops at the limit', () => {
    expect(parseRss(RSS, 1)).toHaveLength(1);
  });
  it('returns nothing for something that is not RSS', () => {
    expect(parseRss('<html><body>Moved</body></html>', 10)).toEqual([]);
  });
});

describe('refreshFeeds', () => {
  const sources = [
    { id: 'good', label: 'Good', url: 'https://good.example/rss' },
    { id: 'down', label: 'Down', url: 'https://down.example/rss' },
  ];
  const deps = (logs: string[]) => ({
    now: () => new Date('2026-11-08T20:00:00Z'),
    fetchText: async (url: string) => {
      if (url.includes('down')) throw new Error('HTTP 503');
      return RSS;
    },
    log: (m: string) => logs.push(m),
  });

  it('fetches every feed and keeps the last good copy of one that fails', async () => {
    const previous: FeedsFile = {
      updatedAt: '2026-11-08T19:30:00.000Z',
      feeds: [
        {
          id: 'down',
          label: 'Down',
          fetchedAt: '2026-11-08T19:30:00.000Z',
          items: [{ title: 'Old news', link: 'https://down.example/1', published: null }],
        },
      ],
    };
    const logs: string[] = [];
    const file = await refreshFeeds(sources, previous, 2, deps(logs));
    expect(file.updatedAt).toBe('2026-11-08T20:00:00.000Z');
    expect(file.feeds[0]).toMatchObject({ id: 'good', fetchedAt: '2026-11-08T20:00:00.000Z' });
    expect(file.feeds[0]?.items).toHaveLength(2);
    expect(file.feeds[1]).toEqual(previous.feeds[0]);
    expect(logs).toEqual(['feeds: down failed (HTTP 503); keeping the last good copy']);
  });

  it('leaves a never-fetched feed empty', async () => {
    const file = await refreshFeeds(sources, null, 2, deps([]));
    expect(file.feeds[1]).toEqual({ id: 'down', label: 'Down', fetchedAt: null, items: [] });
  });
});
