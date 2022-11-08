import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [svelte()],

	server: {
		hmr: {
			protocol: 'ws',
			host: 'localhost',
			port: 3000,
		},
		port: 3000,
		host: 'localhost',
	},
	build: {
		outDir: './dist/static',
	},
});
