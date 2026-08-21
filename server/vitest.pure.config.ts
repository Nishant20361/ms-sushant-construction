import {defineConfig} from "vitest/config";
export default defineConfig({test:{environment:"node",include:["tests/push.service.test.ts","tests/bill.test.ts","tests/report.test.ts"]}});
