module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist/", "node_modules/", "coverage/"],
  rules: {
    // The existing codebase uses `any` at API/ORM boundaries. TypeScript's
    // compiler remains the enforcement mechanism while these are migrated.
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "prefer-const": "off",
  },
  overrides: [
    {
      files: ["client/**/*.{ts,tsx}"],
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        // Context modules intentionally export hooks alongside providers.
        "react-refresh/only-export-components": "off",
      },
    },
  ],
};
