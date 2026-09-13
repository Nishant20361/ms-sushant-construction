import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeSourcePath } from "./package.mjs";

test("source archive excludes secrets, native signing keys, uploads and output", () => {
  for (const path of [".env", "server/.env.test", "mobile/credentials.json", "admin-mobile/release.keystore", "server/uploads/products/a.webp", "server/dist/index.js", "migrate.ts", "verify_rag.ts", "../secret.txt", "backup.db", "source.zip"]) assert.equal(isSafeSourcePath(path), false, path);
});
test("source archive keeps build configuration, templates and migrations", () => {
  for (const path of [".env.example", "server/.env.example", "client/.env.production", "server/src/app.ts", "server/prisma/migrations/initial/migration.sql", "package-lock.json", ".github/workflows/ci.yml"]) assert.equal(isSafeSourcePath(path), true, path);
});
