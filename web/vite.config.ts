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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), exhibitFolders()],
});
