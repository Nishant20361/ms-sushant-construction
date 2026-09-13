#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { lstat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pipeline } from "node:stream/promises";
import archiver from "archiver";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "ms-sushant-construction-source.zip");

export function isSafeSourcePath(name) {
  const parts = name.replaceAll("\\", "/").split("/");
  const base = parts.at(-1);
  if (parts.some((part) => ["..", "node_modules", ".git", ".expo", "dist", "build", "coverage", "uploads"].includes(part))) return false;
  if (/^\.env(?:\.|$)/.test(base)) return base === ".env.example" || name === "client/.env.production";
  return !/\.(?:zip|log|db|sqlite|pem|key|p12|pfx|jks|keystore|tsbuildinfo)$/i.test(base) &&
    !["credentials.json", "google-services.json", ".DS_Store", "MEMORY.md", "memory.md"].includes(base) &&
    !/^(?:migrate|verify_assistant|verify_assistant_part2|verify_rag)\.ts$/.test(base);
}

async function main() {
  // Git's ignore rules prevent private local scripts and ignored credentials
  // from being bundled. A second allowlist guard also checks tracked files.
  const names = [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0"))]
    .filter((name) => name && isSafeSourcePath(name));
  const archive = archiver("zip", { zlib: { level: 9 } });
  const completion = pipeline(archive, createWriteStream(OUT));
  // Attach error handling before adding files to avoid unhandled stream errors.
  completion.catch(() => {});
  let count = 0;
  try {
    for (const name of names) {
      const file = join(ROOT, name);
      const info = await lstat(file).catch(() => null);
      if (!info?.isFile()) continue; // Never follow symlinks outside the source tree.
      archive.file(file, { name: `ms-sushant-construction/${name}` });
      count++;
    }
    await archive.finalize();
    await completion;
    console.log(`Created ${basename(OUT)} (${count} source files, ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    archive.destroy(error);
    await completion.catch(() => {});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error("Packaging failed:", error.message); process.exitCode = 1; });
}
