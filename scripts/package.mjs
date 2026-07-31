#!/usr/bin/env node

/**
 * Creates a clean source ZIP of the project.
 * Excludes: node_modules, .env, logs, uploaded files, dist, .git, coverage.
 */

import { createWriteStream, existsSync } from "fs";
import { readFile, stat } from "fs/promises";
import { join, relative, resolve } from "path";
import { pipeline } from "stream/promises";
import archiver from "archiver";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "ms-sushant-construction-source.zip");

const EXCLUDE_PATTERNS = [
  "node_modules",
  ".env",
  ".env.*",
  "logs",
  "*.log",
  "dist",
  "build",
  "coverage",
  ".git",
  ".DS_Store",
  "Thumbs.db",
  "dev.db",
  "dev.db-journal",
  "server/uploads/*",
  "*.tsbuildinfo",
  ".vscode",
  ".idea",
  "ms-sushant-construction-source.zip",
];

function shouldExclude(name, path) {
  for (const p of EXCLUDE_PATTERNS) {
    const glob = new RegExp(p.replace(/\*/g, ".*").replace(/\./g, "\\."));
    if (glob.test(name)) return true;
    if (glob.test(path)) return true;
  }
  return false;
}

async function walk(dir) {
  const entries = [];
  const { readdir } = await import("fs/promises");
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const full = join(dir, item.name);
    const rel = relative(ROOT, full);
    if (shouldExclude(item.name, rel)) continue;
    if (item.isDirectory()) {
      entries.push(...(await walk(full)));
    } else {
      entries.push(full);
    }
  }
  return entries;
}

async function main() {
  console.log("📦 Packaging source code…");
  const files = await walk(ROOT);

  const output = createWriteStream(OUT);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`✅ Created: ${OUT}`);
    console.log(`   Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Files: ${files.length}`);
  });

  archive.on("warning", (err) => {
    if (err.code === "ENOENT") console.warn("⚠️", err.message);
    else throw err;
  });

  archive.pipe(output);

  for (const file of files) {
    const rel = relative(ROOT, file);
    archive.file(file, { name: join("ms-sushant-construction", rel) });
  }

  await archive.finalize();
}

main().catch((err) => {
  console.error("❌ Packaging failed:", err.message);
  process.exit(1);
});
