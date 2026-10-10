import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { expect, it } from "vitest";

it("generates an enabled recording permission after all native plugins run", () => {
  const projectDir = fileURLToPath(new URL("../../../", import.meta.url));
  const generated = JSON.parse(execFileSync(process.execPath, [path.join(projectDir, "node_modules/expo/bin/cli"), "config", "--type", "introspect", "--json"], {
    cwd: projectDir,
    env: { ...process.env, EXPO_NO_DOTENV: "1", EXPO_NO_TELEMETRY: "1" },
    encoding: "utf8",
  }));
  const permissions: Record<string, unknown>[] = [];
  function visit(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === "object") {
      const item = value as Record<string, unknown>;
      if (item["android:name"] === "android.permission.RECORD_AUDIO") permissions.push(item);
      Object.values(item).forEach(visit);
    }
  }
  visit(generated._internal.modResults.android.manifest);
  expect(permissions.length).toBeGreaterThan(0);
  expect(permissions.every(permission => permission["tools:node"] !== "remove")).toBe(true);
}, 30_000);
