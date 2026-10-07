import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      ".agents/**",
      "next-env.d.ts",
      "postcss.config.mjs",
      "next.config.mjs",
      "scripts/**"
    ]
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn"
    }
  }
];
