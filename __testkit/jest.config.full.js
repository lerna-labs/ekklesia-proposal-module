/** @type {import('jest').Config} */
/** Same as jest.config.js but runs performance + rate-limit suites (no testPathIgnorePatterns). */
export default {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  roots: ["<rootDir>"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: ["/node_modules/"],
};
