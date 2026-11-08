/**
 * Builds the headlines file: fetch every feed, keep the last good headlines for any feed that
 * fails this time. No AWS here (see handler.ts), so it can be tested with fakes.
 */
import { parseRss, type Headline } from './rss';
import type { FeedSource } from './sources';

export interface FeedResult {
  id: string;
  label: string;
  /** When these headlines were fetched (ISO), or null if never. */
  fetchedAt: string | null;
  items: Headline[];
}

export interface FeedsFile {
  updatedAt: string;
  feeds: FeedResult[];
}

export interface RefreshDeps {
  now: () => Date;
  /** Fetches a URL's body as text; throws on network errors or non-2xx. */
  fetchText: (url: string) => Promise<string>;
  log: (message: string) => void;
}

export async function refreshFeeds(
  sources: readonly FeedSource[],
  previous: FeedsFile | null,
  limit: number,
  deps: RefreshDeps,
): Promise<FeedsFile> {
  const now = deps.now().toISOString();
  const feeds = await Promise.all(
    sources.map(async (src): Promise<FeedResult> => {
      const old = previous?.feeds.find((f) => f.id === src.id);
      try {
        const items = parseRss(await deps.fetchText(src.url), limit);
        if (items.length === 0) throw new Error('no items');
        return { id: src.id, label: src.label, fetchedAt: now, items };
      } catch (err) {
        deps.log(
          `feeds: ${src.id} failed (${err instanceof Error ? err.message : String(err)}); keeping the last good copy`,
        );
        return {
          id: src.id,
          label: src.label,
          fetchedAt: old?.fetchedAt ?? null,
          items: old?.items ?? [],
        };
      }
    }),
  );
  return { updatedAt: now, feeds };
}
