/**
 * Scheduled Lambda (every 30 minutes): refresh the exhibits' headlines and save each set as a
 * static file in the site bucket, where the pages read them (/feeds/schportz.json,
 * /feeds/apf.json). It never throws: a failing feed keeps its last good headlines.
 */
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { refreshFeeds, type FeedsFile } from './refresh';
import { FEED_FILES, ITEMS_PER_FEED, type FeedSource } from './sources';

const s3 = new S3Client({});
const USER_AGENT = 'appbep.com headline reader (+https://appbep.com/)';

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function readPrevious(bucket: string, key: string): Promise<FeedsFile | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return JSON.parse((await res.Body?.transformToString()) ?? 'null') as FeedsFile | null;
  } catch (err) {
    if (!(err instanceof NoSuchKey)) console.error('feeds: could not read the previous file', err);
    return null;
  }
}

async function refreshFile(bucket: string, key: string, sources: readonly FeedSource[]) {
  const previous = await readPrevious(bucket, key);
  const file = await refreshFeeds(sources, previous, ITEMS_PER_FEED, {
    now: () => new Date(),
    fetchText,
    log: (m) => console.warn(`${key}: ${m}`),
  });
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(file),
      ContentType: 'application/json',
      // CloudFront and browsers may reuse it for 5 minutes.
      CacheControl: 'public, max-age=300',
    }),
  );
}

export async function handler(): Promise<{ ok: boolean }> {
  const bucket = process.env.BUCKET ?? '';
  // One file failing to save must not stop the others.
  const results = await Promise.allSettled(
    FEED_FILES.map((f) => refreshFile(bucket, f.key, f.sources)),
  );
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`feeds: ${FEED_FILES[i]?.key} failed`, r.reason);
  });
  return { ok: results.every((r) => r.status === 'fulfilled') };
}
