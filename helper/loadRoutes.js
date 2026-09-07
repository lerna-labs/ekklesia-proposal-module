import fs from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "url";

/**
 * Recursively loads route files from a directory and registers them with the Express app.
 * Per-file import errors are logged and collected so the full tree is walked; the top-level
 * call then throws if any file failed (fail-fast before the server listens).
 *
 * @param {string} directory - The base directory to search for route files
 * @param {object} app - The Express application instance
 * @param {string} [baseRoute] - The base route path (used for recursion)
 * @param {{ path: string, message: string }[]} [failures] - Shared failure list for recursion
 * @returns {Promise<void>}
 */
export async function loadRoutes(directory, app, baseRoute = "", failures = []) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    try {
      if (entry.isDirectory()) {
        // If it's a directory, recursively load routes from it
        const nextBaseRoute = join(baseRoute, entry.name).replace(/\\/g, "/");
        await loadRoutes(fullPath, app, nextBaseRoute, failures);
      } else if (entry.name.endsWith(".js") && entry.name !== "index.js") {
        // If it's a JS file (excluding index.js files)
        const routeName = entry.name.replace(".js", "");
        const routePath = `/${baseRoute}/${routeName}`.replace(/\/+/g, "/");

        // Use dynamic import for ESM compatibility
        const routeModule = await import(pathToFileURL(fullPath).href);
        const router = routeModule.default;

        if (router && typeof router.use === "function") {
          console.log(`Route loaded: ${routePath}`);
          app.use(routePath, router);
        }
      }
    } catch (error) {
      const message = error?.message ?? String(error);
      console.error(`Error loading route ${fullPath}: ${message}`);
      failures.push({ path: fullPath, message });
    }
  }

  if (baseRoute === "" && failures.length > 0) {
    const summary = failures.map((f) => `${f.path}: ${f.message}`).join("; ");
    throw new Error(`Failed to load ${failures.length} route(s): ${summary}`);
  }
}
