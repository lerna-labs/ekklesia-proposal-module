import adapter from "@sveltejs/adapter-static";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import viteCompression from "vite-plugin-compression";

/**
 * Inject or omit shell OG/Twitter URL+image meta from VITE_SITE_URL (F-017).
 * Uses __SITE_URL__ placeholders so Vite's built-in %VITE_*% HTML replacement
 * cannot leave empty or relative URLs when the env var is unset.
 */
function siteUrlMetaPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = String(env.VITE_SITE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  return {
    name: "inject-site-url-meta",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (siteUrl) {
          return html
            .replaceAll("__SITE_URL__/", `${siteUrl}/`)
            .replaceAll("__SITE_URL__", siteUrl);
        }

        return html
          .replace(
            /\s*<meta\s+property="og:image"\s+content="__SITE_URL__\/images\/social\.png"\s*\/>/g,
            "",
          )
          .replace(/\s*<meta\s+property="og:image:width"\s+content="1200"\s*\/>/g, "")
          .replace(/\s*<meta\s+property="og:image:height"\s+content="630"\s*\/>/g, "")
          .replace(/\s*<meta\s+property="og:url"\s+content="__SITE_URL__\/"\s*\/>/g, "")
          .replace(
            /\s*<meta\s+name="twitter:image"\s+content="__SITE_URL__\/images\/social\.png"\s*\/>/g,
            "",
          );
      },
    },
  };
}

// Get the directory where this config file is located
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, "static");

// Get version from package.json
let appVersion = "0.0.0";
try {
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));
  appVersion = packageJson.version || appVersion;
} catch (err) {
  if (err) console.warn("Could not read package.json, using default version:", appVersion);
}

// Ensure the static directory exists
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

// Write version.json to static directory
fs.writeFileSync(
  path.join(staticDir, "version.json"),
  JSON.stringify({ version: appVersion, buildTime: new Date().toISOString() }, null, 2),
);

console.log(`Created version.json with version ${appVersion}`);

export default defineConfig(({ mode }) => ({
  plugins: [
    siteUrlMetaPlugin(mode),
    tailwindcss(),
    sveltekit({
      preprocess: vitePreprocess(),

      // Using adapter-static since we're serving the app as static files from Express
      adapter: adapter({
        // Build output location
        pages: "../public",
        assets: "../public",
        fallback: "index.html",
      }),

      alias: {
        $stores: path.resolve("./src/stores"),
      },
    }),
    viteCompression({ algorithm: "gzip", ext: ".gz" }),
    viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
    // SvelteKit 3 sets build.cssMinify to true, so re-apply esbuild after its config hook.
    // lightningcss rejects nested @keyframes from a dependency; esbuild minify needs the esbuild devDependency.
    {
      name: "css-minify-esbuild",
      enforce: "post",
      config: () => ({ build: { cssMinify: "esbuild" } }),
    },
  ],
}));
