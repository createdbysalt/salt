import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import semanticColorsPlugin from "./eslint-plugins/semantic-colors.mjs";

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
      "**/ralph-worktrees/**",
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

  // Semantic colors plugin - enforces design system consistency
  {
    plugins: {
      "semantic-colors": semanticColorsPlugin,
    },
    rules: {
      // Warn about raw Tailwind colors (bg-blue-500, text-gray-900, etc.)
      // Use semantic colors instead (bg-primary, text-foreground, etc.)
      "semantic-colors/no-raw-colors": [
        "warn",
        {
          // Ignore specific patterns if needed (e.g., chart colors, gradients)
          ignore: [
            "from-*",  // Gradient start colors may need raw values
            "via-*",   // Gradient middle colors
            "to-*",    // Gradient end colors
          ],
        },
      ],
    },
  },
];
