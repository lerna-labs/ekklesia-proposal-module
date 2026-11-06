import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      "node_modules/**",
      "__frontend/**",
      "docs-site/**",
      "public/**",
      "backup/data/**",
      "logs/**",
      "package-lock.json",
    ],
  },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
