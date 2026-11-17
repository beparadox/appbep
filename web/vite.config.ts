import * as fs from 'node:fs';
import * as path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-server twin of the CloudFront viewer-request function (infra/lib/viewer-request.ts):
 * /exhibits/<name>/ serves that folder's index.html instead of falling back to the React app.
 */
function exhibitFolders(): Plugin {
  return {
    name: 'exhibit-folders',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query] = (req.url ?? '').split('?');
        if (path.startsWith('/exhibits/') && path.endsWith('/')) {
          req.url = `${path}index.html${query ? `?${query}` : ''}`;
        }
        next();
      });
    },
  };
}

/**
 * Quiz questions live in content/quizzes/*.json (the API reads them too). The exhibit pages
 * fetch them from /quizzes/<name>.json: served from there in dev, copied into the build.
 */
const QUIZ_DIR = path.resolve(__dirname, '..', 'content', 'quizzes');
function quizFiles(): Plugin {
  const files = () => fs.readdirSync(QUIZ_DIR).filter((f) => f.endsWith('.json'));
  return {
    name: 'quiz-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /^\/quizzes\/([\w-]+\.json)$/.exec((req.url ?? '').split('?')[0] ?? '');
        if (!m?.[1] || !files().includes(m[1])) return next();
        res.setHeader('content-type', 'application/json');
        res.end(fs.readFileSync(path.join(QUIZ_DIR, m[1])));
      });
    },
    generateBundle() {
      for (const name of files()) {
        // Minified: the repo copy is formatted for reading.
        const source = JSON.stringify(
          JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, name), 'utf8')),
        );
        this.emitFile({ type: 'asset', fileName: `quizzes/${name}`, source });
      }
    },
  };
}

/**
 * Birthday cards live in the site bucket under cards/<id>/, never in this repo. In dev,
 * set CARDS_DIR to a folder of built cards (scripts/card-picker/build.py writes them to
 * <card>/out) to serve /cards/<id>/... from it.
 */
const TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
};
function cardFiles(): Plugin {
  const dir = process.env.CARDS_DIR ? path.resolve(process.env.CARDS_DIR) : null;
  return {
    name: 'card-files',
    configureServer(server) {
      if (!dir) return;
      server.middlewares.use((req, res, next) => {
        const m = /^\/cards\/([a-z0-9]+\/[\w.-]+)$/.exec((req.url ?? '').split('?')[0] ?? '');
        if (!m?.[1]) return next();
        const file = path.join(dir, m[1]);
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          return res.end();
        }
        const size = fs.statSync(file).size;
        res.setHeader('content-type', TYPES[path.extname(file)] ?? 'application/octet-stream');
        res.setHeader('accept-ranges', 'bytes');
        // Videos need byte ranges to play and seek (Safari won't play them without).
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
        if (range) {
          const start = range[1] ? Number(range[1]) : size - Number(range[2]);
          const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
          res.statusCode = 206;
          res.setHeader('content-range', `bytes ${start}-${end}/${size}`);
          res.setHeader('content-length', end - start + 1);
          return fs.createReadStream(file, { start, end }).pipe(res);
        }
        res.setHeader('content-length', size);
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), exhibitFolders(), quizFiles(), cardFiles()],
});
