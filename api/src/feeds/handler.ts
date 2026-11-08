/**
 * Scheduled Lambda (every 30 minutes): refresh the Schportz headlines and save them as a static
 * file in the site bucket, where the page reads them (/feeds/schportz.json).
 * It never throws: a failing feed keeps its last good headlines.
 */
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { refreshFeeds, type FeedsFile } from './refresh';
import { ITEMS_PER_FEED, SCHPORTZ_FEEDS } from './sources';

const s3 = new S3Client({});
const USER_AGENT = 'appbep.com headline reader (+https://appbep.com/exhibits/schportz/)';

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

export async function handler(): Promise<{ ok: boolean }> {
  const bucket = process.env.BUCKET ?? '';
  const key = process.env.FEEDS_KEY ?? 'feeds/schportz.json';
  try {
    const previous = await readPrevious(bucket, key);
    const file = await refreshFeeds(SCHPORTZ_FEEDS, previous, ITEMS_PER_FEED, {
      now: () => new Date(),
      fetchText,
      log: (m) => console.warn(m),
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
    return { ok: true };
  } catch (err) {
    console.error('feeds: refresh failed', err);
    return { ok: false };
  }
}
