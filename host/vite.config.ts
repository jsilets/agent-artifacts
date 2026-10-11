import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

/**
 * `vite` runs the Worker in workerd with local bindings. `vite build` writes the output
 * that `cf deploy --prebuilt` deploys. The Worker imports ../kit/explain.css, so Vite may
 * read the repo root.
 */
export default defineConfig({ plugins: [cloudflare()], server: { fs: { allow: ['..'] } } });
