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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), exhibitFolders(), quizFiles()],
});
