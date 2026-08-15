import { ApiError, NetworkError, TimeoutError } from "@/services/apiClient";
export function assistantErrorMessage(error: unknown): string {
  if (error instanceof TimeoutError) return "The assistant is taking longer than expected. The server may still be starting.";
  if (error instanceof NetworkError) return "We couldn't connect to the assistant. Check your connection and try again.";
  if (error instanceof ApiError && error.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (error instanceof ApiError && error.status >= 500) return "The assistant is temporarily unavailable. Please try again.";
  if (error instanceof ApiError && error.status === 400) return "Please review your question and try again.";
  return "We couldn't get an answer right now. Please try again.";
}
