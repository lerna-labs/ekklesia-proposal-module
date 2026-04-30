import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IntlMessageFormat } from "intl-messageformat";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N_DIR = path.join(__dirname, "i18n");
const DEFAULT_LOCALE = "en";

/**
 * Per-locale catalog cache — hydrating the same locale twice in one process
 * should not touch disk twice. An ENOENT result is cached as `null` so repeated
 * lookups for an unsupported locale don't re-trigger a stat.
 */
const catalogCache = new Map();

async function loadCatalog(locale) {
  if (catalogCache.has(locale)) return catalogCache.get(locale);
  const file = path.join(I18N_DIR, `${locale}.json`);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    catalogCache.set(locale, parsed);
    return parsed;
  } catch (err) {
    if (err.code === "ENOENT") {
      catalogCache.set(locale, null);
      return null;
    }
    throw err;
  }
}

/**
 * Build the locale-fallback chain per TRD §4.6 SL-051:
 *   requested tag → base language → DEFAULT_LOCALE.
 */
function fallbackChain(locale) {
  const seen = new Set();
  const chain = [];
  const push = (l) => {
    if (l && !seen.has(l)) {
      seen.add(l);
      chain.push(l);
    }
  };
  if (locale) {
    push(locale);
    const dash = locale.indexOf("-");
    if (dash > 0) push(locale.slice(0, dash));
  }
  push(DEFAULT_LOCALE);
  return chain;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

function escapeArgs(vars) {
  if (!vars) return {};
  const out = {};
  for (const [k, v] of Object.entries(vars)) {
    out[k] = typeof v === "string" ? htmlEscape(v) : v;
  }
  return out;
}

/**
 * Create a translator bound to a locale (with fallback to DEFAULT_LOCALE).
 * The returned function escapes string arguments before ICU substitution so
 * output is safe to drop into triple-brace Handlebars in an HTML context.
 * For plain-text output (subject lines, preheader) use `t.raw(key, vars)` —
 * that variant does not escape and should NOT be sent to HTML.
 *
 * Missing keys warn once and render as `[[missing.key]]` so they surface
 * loudly during development.
 *
 * @param {string|undefined} locale - BCP 47 tag; falls back per §4.6
 * @returns {Promise<Function>} `t(key, vars?)` with `t.raw`, `t.locale`, `t.requested`
 */
export async function createTranslator(locale) {
  const requested = locale || DEFAULT_LOCALE;
  const chain = fallbackChain(requested);
  const catalogs = await Promise.all(chain.map(loadCatalog));
  const firstAvailable = catalogs.findIndex((c) => c !== null);
  const chosenLocale =
    firstAvailable >= 0 ? chain[firstAvailable] : DEFAULT_LOCALE;

  const warnedMissing = new Set();
  function warnMissing(key) {
    if (warnedMissing.has(key)) return;
    warnedMissing.add(key);
    console.warn(
      `[i18n] missing key "${key}" in catalogs: ${chain.join(" → ")}`,
    );
  }

  function resolve(key) {
    for (const cat of catalogs) {
      if (cat && typeof cat[key] === "string") return cat[key];
    }
    warnMissing(key);
    return null;
  }

  function format(key, vars, { escape }) {
    const pattern = resolve(key);
    if (pattern === null) return `[[${key}]]`;
    try {
      const args = escape ? escapeArgs(vars) : vars ?? {};
      // ignoreTag: true keeps <strong>...</strong> etc. as literal HTML
      // in the pattern instead of being parsed as ICU rich-text components
      // (which would require passing tag-function arguments). Catalog authors
      // write real tags, `render.js` escapes user-supplied arg values, and
      // the template renders the result via {{{triple-brace}}}.
      return new IntlMessageFormat(pattern, chosenLocale, undefined, {
        ignoreTag: true,
      }).format(args);
    } catch (err) {
      console.warn(`[i18n] format error for "${key}": ${err.message}`);
      return pattern;
    }
  }

  const t = (key, vars) => format(key, vars, { escape: true });
  t.raw = (key, vars) => format(key, vars, { escape: false });
  t.locale = chosenLocale;
  t.requested = requested;
  return t;
}

/** Exposed for tests / diagnostics. */
export function _fallbackChain(locale) {
  return fallbackChain(locale);
}
