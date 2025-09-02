// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    // Global ignore patterns
    ignores: [
      ".*",         // Ignore all dot files and directories in root
      "**/.*",      // Ignore all dot files and directories anywhere
      "**/.*/**",   // Ignore contents of dot directories
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "**/*.d.ts",
    ],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        createDefaultProgram: true,
      },
    },
    rules: {
      // Angular-specific rules
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      "@angular-eslint/no-empty-lifecycle-method": "error",
      "@angular-eslint/use-lifecycle-interface": "error",
      "@angular-eslint/use-pipe-transform-interface": "error",
      "@angular-eslint/component-class-suffix": "error",
      "@angular-eslint/directive-class-suffix": "error",
      "@angular-eslint/no-input-rename": "error",
      "@angular-eslint/no-output-rename": "error",
      "@angular-eslint/no-output-on-prefix": "error",

      // TypeScript rules (adjusted for type checking requirements)
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",

      // General code quality rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      "quote-props": ["error", "as-needed"],
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
      "no-unused-expressions": "error",
      "complexity": ["warn", 10],
      "max-depth": ["warn", 4],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // Angular template rules
      "@angular-eslint/template/button-has-type": "error",
      "@angular-eslint/template/click-events-have-key-events": "error",
      "@angular-eslint/template/mouse-events-have-key-events": "error",
      "@angular-eslint/template/no-autofocus": "error",
      "@angular-eslint/template/no-distracting-elements": "error",
      "@angular-eslint/template/no-positive-tabindex": "error",
      "@angular-eslint/template/role-has-required-aria": "error",
      "@angular-eslint/template/valid-aria": "error",
      "@angular-eslint/template/alt-text": "error",
      "@angular-eslint/template/elements-content": "error",
      "@angular-eslint/template/label-has-associated-control": "error",
      "@angular-eslint/template/table-scope": "error",
    },
  },
  {
    // Cypress test files
    files: ["cypress/**/*.ts", "cypress/**/*.js"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "complexity": "off",
      "max-lines-per-function": "off",
    },
  },
  {
    // Configuration files
    files: ["*.config.js", "*.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  }
);
