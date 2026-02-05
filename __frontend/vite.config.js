import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		viteCompression({ algorithm: 'gzip', ext: '.gz' }),
		viteCompression({ algorithm: 'brotliCompress', ext: '.br' })
	]
});
