import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import viteCompression from 'vite-plugin-compression';

/**
 * Inject or omit shell OG/Twitter URL+image meta from VITE_SITE_URL (F-017).
 * Uses __SITE_URL__ placeholders so Vite's built-in %VITE_*% HTML replacement
 * cannot leave empty or relative URLs when the env var is unset.
 */
function siteUrlMetaPlugin(mode) {
	const env = loadEnv(mode, process.cwd(), '');
	const siteUrl = String(env.VITE_SITE_URL ?? '')
		.trim()
		.replace(/\/+$/, '');

	return {
		name: 'inject-site-url-meta',
		transformIndexHtml: {
			order: 'pre',
			handler(html) {
				if (siteUrl) {
					return html
						.replaceAll('__SITE_URL__/', `${siteUrl}/`)
						.replaceAll('__SITE_URL__', siteUrl);
				}

				return html
					.replace(
						/\s*<meta\s+property="og:image"\s+content="__SITE_URL__\/images\/social\.png"\s*\/>/g,
						''
					)
					.replace(/\s*<meta\s+property="og:image:width"\s+content="1200"\s*\/>/g, '')
					.replace(/\s*<meta\s+property="og:image:height"\s+content="630"\s*\/>/g, '')
					.replace(
						/\s*<meta\s+property="og:url"\s+content="__SITE_URL__\/"\s*\/>/g,
						''
					)
					.replace(
						/\s*<meta\s+name="twitter:image"\s+content="__SITE_URL__\/images\/social\.png"\s*\/>/g,
						''
					);
			}
		}
	};
}

export default defineConfig(({ mode }) => ({
	plugins: [
		siteUrlMetaPlugin(mode),
		tailwindcss(),
		sveltekit(),
		viteCompression({ algorithm: 'gzip', ext: '.gz' }),
		viteCompression({ algorithm: 'brotliCompress', ext: '.br' })
	]
}));
