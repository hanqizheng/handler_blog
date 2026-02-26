import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".deploy/**",
    ".next/**",
    "node_modules/**",
    "dist/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
