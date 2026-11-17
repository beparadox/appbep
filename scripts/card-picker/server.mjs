#!/usr/bin/env node
/**
 * Card picker, step 2: a small local web page for choosing a card's photos and video
 * sections. Run prepare.py on the card folder first.
 *
 *   node scripts/card-picker/server.mjs ~/dev/appbep-cards/<card> [--port 5288]
 *
 * Then open http://localhost:5288. Your picks are saved as you go, to <card>/picks.json
 * (the previous save is kept as picks.prev.json). It listens on this computer only and
 * never changes anything in <card>/originals.
 */
import { createReadStream } from 'node:fs';
import { copyFile, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const cardArg = args.find((a) => !a.startsWith('--'));
if (!cardArg) {
  console.error('Usage: node server.mjs <card folder> [--port 5288]');
  process.exit(1);
}
const card = resolve(cardArg.replace(/^~/, process.env.HOME ?? '~'));
const portAt = args.indexOf('--port');
const port = portAt >= 0 ? Number(args[portAt + 1]) : 5288;
const here = fileURLToPath(new URL('.', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  // Phone videos, whatever they are named (these "*.mpeg" files are really MP4s).
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/mp4',
  '.mpeg': 'video/mp4',
  '.mpg': 'video/mp4',
  '.webm': 'video/webm',
};

/** A path inside `root`, or null if the request tries to climb out of it. */
function inside(root, rel) {
  const p = resolve(root, '.' + sep + decodeURIComponent(rel));
  return p === root || p.startsWith(root + sep) ? p : null;
}

async function sendFile(req, res, path) {
  let info;
  try {
    info = await stat(path);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    res.writeHead(404).end('Not found');
    return;
  }
  const type = TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  // Videos need byte ranges, or the browser can't seek.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : info.size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start < 0) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${info.size}`,
      'Content-Length': end - start + 1,
    });
    createReadStream(path, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': info.size });
  createReadStream(path).pipe(res);
}

async function savePicks(req, res) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2_000_000) {
      res.writeHead(413).end();
      return;
    }
  }
  let picks;
  try {
    picks = JSON.parse(body);
    if (!Array.isArray(picks.items)) throw new Error('no items');
  } catch {
    res.writeHead(400).end('Bad picks');
    return;
  }
  const file = join(card, 'picks.json');
  await copyFile(file, join(card, 'picks.prev.json')).catch(() => {});
  await writeFile(file + '.tmp', JSON.stringify(picks, null, 1));
  await rename(file + '.tmp', file);
  res.writeHead(204).end();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  try {
    if (path === '/') return await sendFile(req, res, join(here, 'picker.html'));
    if (path === '/picker.js' || path === '/picker.css') {
      return await sendFile(req, res, join(here, path.slice(1)));
    }
    if (path === '/picks.json') {
      if (req.method === 'PUT') return await savePicks(req, res);
      const saved = await readFile(join(card, 'picks.json'), 'utf8').catch(() => null);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(saved ?? '{"items":[]}');
    }
    if (path === '/manifest.json')
      return await sendFile(req, res, join(card, 'picker', 'manifest.json'));
    for (const [prefix, root] of [
      ['/picker/', join(card, 'picker')],
      ['/originals/', join(card, 'originals')],
    ]) {
      if (path.startsWith(prefix)) {
        const file = inside(root, path.slice(prefix.length));
        if (!file) return res.writeHead(403).end();
        return await sendFile(req, res, file);
      }
    }
    res.writeHead(404).end('Not found');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500).end();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Card picker for ${card}\n  http://localhost:${port}`);
});
