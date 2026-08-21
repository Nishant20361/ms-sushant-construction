export const shouldInvalidateSession = (status: number, suppressed = false) => status === 401 && !suppressed;
export const shouldRetryCsrf = (status: number, message: string | undefined, alreadyRetried: boolean) => !alreadyRetried && status === 403 && message === "CSRF token missing or invalid";
export type StartupOutcome = "authenticated" | "unauthenticated" | "offline-unverified";
export function startupOutcome(result: "valid" | "unauthorized" | "network-error"): StartupOutcome { return result === "valid" ? "authenticated" : result === "unauthorized" ? "unauthenticated" : "offline-unverified"; }
