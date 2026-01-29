import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory where this config file is located
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, 'static');

// Get version from package.json
let appVersion = '0.0.0';
try {
	const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
	appVersion = packageJson.version || appVersion;
} catch (err) {
	if (err) console.warn('Could not read package.json, using default version:', appVersion);
}

// Ensure the static directory exists
if (!fs.existsSync(staticDir)) {
	fs.mkdirSync(staticDir, { recursive: true });
}

// Write version.json to static directory
fs.writeFileSync(
	path.join(staticDir, 'version.json'),
	JSON.stringify({ version: appVersion, buildTime: new Date().toISOString() }, null, 2)
);

console.log(`Created version.json with version ${appVersion}`);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Using adapter-static since we're serving the app as static files from Express
		adapter: adapter({
			// Build output location
			pages: '../public',
			assets: '../public',
			fallback: 'index.html'
		}),

		// Add aliases for easier imports
		alias: {
			$stores: resolve('./src/stores'),
			$lib: resolve('./src/lib')
		}
	}
};

// Add version as a Vite define (outside of the kit config)
/** @type {import('vite').UserConfig} */
const viteConfig = {
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
	}
};

export default config;
export const vite = viteConfig;
