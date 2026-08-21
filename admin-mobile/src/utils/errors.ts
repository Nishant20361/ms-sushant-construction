import { AdminAppError, type AdminAppErrorKind, type ValidationIssue } from "@/types/errors";

interface ErrorPayload { error?: string; details?: ValidationIssue[] }

function kindForStatus(status: number): AdminAppErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "unknown";
}

export function errorFromResponse(status: number, payload: ErrorPayload | null): AdminAppError {
  return new AdminAppError(kindForStatus(status), payload?.error || "The request could not be completed.", { status, issues: payload?.details });
}

export function normalizeUnknownError(error: unknown): AdminAppError {
  if (error instanceof AdminAppError) return error;
  if (error instanceof Error && error.name === "AbortError") return new AdminAppError("timeout", "The request timed out. Please try again.", { cause: error });
  if (error instanceof TypeError) return new AdminAppError("network", "Unable to connect. Check your internet connection.", { cause: error });
  return new AdminAppError("unknown", "Something went wrong. Please try again.", { cause: error });
}
