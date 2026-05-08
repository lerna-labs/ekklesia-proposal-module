import fs from "fs/promises";
import os from "os";
import path from "path";
import { loadRoutes } from "../../helper/loadRoutes.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "route-loader-isolation-"));
const routesDir = path.join(tempRoot, "routes");
await fs.mkdir(routesDir, { recursive: true });

await fs.writeFile(
  path.join(routesDir, "good.js"),
  `const router = { use() {} };
export default router;
`,
  "utf8",
);

await fs.writeFile(
  path.join(routesDir, "broken.js"),
  `throw new Error("simulated import failure");`,
  "utf8",
);

const mounted = [];
const app = {
  use(routePath) {
    mounted.push(routePath);
  },
};

await loadRoutes(routesDir, app);

await fs.rm(tempRoot, { recursive: true, force: true });

if (!mounted.includes("/good")) {
  console.error("Expected /good route to be mounted even when sibling import fails.");
  process.exit(1);
}

if (mounted.includes("/broken")) {
  console.error("Broken route should not be mounted.");
  process.exit(1);
}

console.log("Route loader isolation check passed.");
