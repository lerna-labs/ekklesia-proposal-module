/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  roots: ["<rootDir>"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  // Excluded from default `npm test` — run via `test:perf`, `test:*:ratelimit`, or `npm run test:full`.
  testPathIgnorePatterns: [
    "<rootDir>/tests/performance\\.test\\.js",
    "<rootDir>/tests/performance/",
    "<rootDir>/tests/session-rate-limit\\.test\\.js",
    "<rootDir>/tests/comment-rate-limit\\.test\\.js",
    "<rootDir>/tests/z-public-rate-limit\\.test\\.js",
  ],
};
