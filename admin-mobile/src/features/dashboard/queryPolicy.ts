import { AdminAppError } from "@/types/errors";
export function shouldRetryDashboard(failureCount: number, error: unknown) { if (failureCount >= 1) return false; return error instanceof AdminAppError ? ["network", "timeout", "server"].includes(error.kind) : false; }
