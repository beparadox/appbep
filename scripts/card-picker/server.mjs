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
 *
 * Its "Rebuild the card" button runs build.py on the card. That needs the cards venv's
 * Python: <card>/../.venv/bin/python, or set CARD_PYTHON.
 */
import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
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
const python =
  process.env.CARD_PYTHON ??
  (existsSync(join(card, '..', '.venv', 'bin', 'python'))
    ? join(card, '..', '.venv', 'bin', 'python')
    : 'python3');

let building = false;
/**
 * Runs one of the card scripts on the card (build.py, or prepare.py to take in new
 * photos); answers with how it went and its last lines of output.
 */
function runScript(res, script, extra = []) {
  if (building) {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, log: 'Busy with the last one: try again in a moment.' }));
    return;
  }
  building = true;
  let log = '';
  const child = spawn(python, ['-I', join(here, script), card, ...extra]);
  const keep = (chunk) => {
    // The progress counter rewrites one line with \r: keep only the last of it.
    log = (log + chunk.toString())
      .split('\n')
      .map((l) => l.split('\r').pop())
      .join('\n');
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  const done = (ok) => {
    building = false;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok, log: log.trim().split('\n').slice(-12).join('\n') }));
  };
  child.on('error', (err) => {
    log += String(err);
    done(false);
  });
  child.on('close', (code) => done(code === 0));
}

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
    if (path === '/build' && req.method === 'POST') return runScript(res, 'build.py');
    if (path === '/take-new' && req.method === 'POST') {
      return runScript(res, 'prepare.py', ['--take-new']);
    }
    if (path === '/crops.json') {
      // Crops are set in card.config.json (build.py makes them); the page only shows them.
      const config = await readFile(join(card, 'card.config.json'), 'utf8').catch(() => '{}');
      let crop = {};
      try {
        crop = JSON.parse(config).crop ?? {};
      } catch {
        /* a half-written config: no crops */
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(crop));
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
