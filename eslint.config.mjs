import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  // Ignore patterns
  {
    ignores: [
      "**/node_modules/**",
      "**/node_modules_backup/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/archive/**",
      "**/apps.old/**",
      "**/.turbo/**",
    ],
  },

  // Extend Next.js core-web-vitals config
  ...compat.extends("next/core-web-vitals"),

  // Custom rules
  {
    rules: {
      // Warnings instead of errors for common issues
      "react/no-unescaped-entities": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Console logs allowed in development
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
