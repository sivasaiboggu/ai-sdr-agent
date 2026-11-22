import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react()],
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
