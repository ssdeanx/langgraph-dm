import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

// You must install this plugin to use its rules: npm install eslint-plugin-import
// import importPlugin from "eslint-plugin-import";

// Replicate __dirname functionality in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize FlatCompat for extending older string-based configs
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  // Global ignores. These apply to all configurations.
  {
    ignores: ["node_modules/", "dist/", "build/"],
  },

  // Extend recommended configurations using FlatCompat.
  ...compat.extends("plugin:@typescript-eslint/recommended"),
  ...compat.extends("prettier"),

  // Your main, custom configuration for TypeScript files.
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // Use `project: true` for typescript-eslint to automatically find your tsconfig.json
        project: true,
        tsconfigRootDir: __dirname,
        sourceType: "module",
        ecmaVersion: 2021,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      // "import": importPlugin, // Uncomment if you have eslint-plugin-import installed
    },
    rules: {
            // --- Core Best Practices (Keep These) ---
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
      "no-process-env": "warn",

      // --- Recommended for LangGraph.js ---
      "no-param-reassign": ["error", { props: true }],
      "@typescript-eslint/explicit-function-return-type": ["warn", { allowExpressions: true }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      // --- Your Existing Preferences (Good defaults) ---
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-use-before-define": ["error", { functions: false }],
      camelcase: "off",
      "class-methods-use-this": "off",
      "keyword-spacing": "error",
      "max-classes-per-file": "off",
      "no-await-in-loop": "off",
      "no-console": "off",
      "no-restricted-syntax": "off",
      "no-shadow": "off",
      "no-underscore-dangle": "off",
      "no-use-before-define": "off",
      "no-useless-constructor": "off",
      "no-return-await": "off",
      "consistent-return": "off",
      "new-cap": ["error", { properties: false, capIsNew: false }],
    },
  },
);