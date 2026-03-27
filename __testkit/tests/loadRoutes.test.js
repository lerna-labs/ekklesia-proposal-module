import fs from "fs/promises";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";

import { loadRoutes } from "../../helper/loadRoutes.js";

describe("loadRoutes", () => {
  it("loads route module when directory path contains #", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "loadRoutes-#-"));
    const routesDir = path.join(tempRoot, "api");
    const nestedDir = path.join(routesDir, "v0#frag");
    await fs.mkdir(nestedDir, { recursive: true });

    const routeFile = path.join(nestedDir, "health.js");
    await fs.writeFile(
      routeFile,
      'module.exports = { use() {} };',
      "utf8",
    );

    const app = { use: jest.fn() };

    try {
      await expect(loadRoutes(routesDir, app)).resolves.toBeUndefined();
      expect(app.use).toHaveBeenCalledTimes(1);
      expect(app.use).toHaveBeenCalledWith(
        "/v0#frag/health",
        expect.objectContaining({ use: expect.any(Function) }),
      );
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
