import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

import { terminalPlugin } from './config/vite-plugin-terminal';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [
			tailwindcss(),
			sentrySvelteKit({
				org: 'us-army-2k',
				project: 'argos',
				authToken: env.SENTRY_AUTH_TOKEN,
				autoUploadSourceMaps: Boolean(env.SENTRY_AUTH_TOKEN),
				telemetry: false
			}),
			sveltekit(),
			terminalPlugin(),
			devtoolsJson()
		],
		server: {
			host: '0.0.0.0',
			port: 5173,
			watch: {
				ignored: [
					'**/*.db',
					'**/*.db-wal',
					'**/*.db-shm',
					'**/*.sqlite',
					'**/*.log',
					'**/logs/**',
					'**/coverage/**',
					'**/test-results/**',
					'**/tmp/**',
					'**/data/**',
					'**/.svelte-kit/output/**'
				]
			}
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes('maplibre-gl')) return 'vendor-maplibre';
						if (id.includes('mil-sym-ts')) return 'vendor-milsym';
						if (id.includes('xterm')) return 'vendor-xterm';
					}
				}
			}
		},
		optimizeDeps: {
			include: ['leaflet', 'cytoscape', 'mgrs']
		},
		ssr: {
			noExternal: ['mgrs', 'mode-watcher']
		},
		define: {
			global: 'globalThis'
		}
	};
});
