import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Direct hash links can fetch their route alongside the app entry.
const preloadInitialRoute: Plugin = {
  name: 'preload-initial-route',
  transformIndexHtml: {
    order: 'post',
    handler(_html, { bundle }) {
      if (!bundle) return
      const routes: Record<string, string[]> = {}
      for (const name in bundle) {
        const output = bundle[name]
        if (output.type !== 'chunk' || !output.isDynamicEntry) continue
        const page = output.facadeModuleId?.match(/\/src\/pages\/([A-Za-z]+)\.tsx$/)?.[1]
        if (!page) continue
        routes[page.toLowerCase()] = [output.fileName, ...output.imports.filter((name) => {
          const imported = bundle[name]
          return imported?.type === 'chunk' && !imported.isEntry
        })]
      }
      return [{
        tag: 'script',
        injectTo: 'head',
        children: `{
          const route = location.hash.slice(2).split(/[?/]/, 1)[0];
          const files = ${JSON.stringify(routes)};
          for (const file of Object.hasOwn(files, route) ? files[route] : []) {
            const link = document.createElement('link');
            link.rel = 'modulepreload';
            link.crossOrigin = 'anonymous';
            link.href = './' + file;
            document.head.append(link);
          }
        }`,
      }]
    },
  },
}

// Dev only: the frontend calls relative `/api/*` (see src/lib/data.ts).
// The proxy strips the `/api` prefix because the backend serves its
// routes bare (`/chat`, `/campaigns`, `/approve`) as well as under
// `/api/*`. Without the rewrite, `/api/chat` proxied to a backend path
// that did not exist and every dashboard call 404'd.
// The localhost target below only affects `npm run dev`; production
// builds never contain it (the frontend uses VITE_API_URL instead).
// `base: './'` — the build emits relative asset paths, so the same
// dist works served from a domain root (Vercel), a subpath (GitHub
// Pages) and opened straight from disk (file://) for local review.
// With the default absolute base, a file:// render loaded nothing.
export default defineConfig({
  base: './',
  plugins: [react(), preloadInitialRoute],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
