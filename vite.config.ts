import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * Rewrites every /admin/* request to /probe-admin.html so that
 * hard-refreshing on a deep admin URL (e.g. /admin/students) works
 * correctly with BrowserRouter instead of returning a 404.
 */
function adminFallback(): Plugin {
  const rewrite = (req: any, _res: any, next: () => void) => {
    if (req.url && /^\/admin(\/|$|\?)/.test(req.url)) {
      req.url = '/probe-admin.html';
    }
    next();
  };

  return {
    name: 'admin-fallback',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), adminFallback()],
})
