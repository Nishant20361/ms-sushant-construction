import { AdminAppError } from "@/types/errors";
export type AuthOperation = "login" | "forgot" | "reset";
export function authErrorMessage(error: unknown, operation: AuthOperation): string {
  if (!(error instanceof AdminAppError)) return "Something went wrong. Please try again.";
  if (error.kind === "network" || error.kind === "timeout") return "You're offline. Check your connection and try again.";
  if (error.kind === "rate_limited") return operation === "login" ? "Too many sign-in attempts. Please try again later." : "Too many requests. Please try again later.";
  if (error.kind === "unauthorized") return "Invalid username or password.";
  if (error.kind === "server") return "The server is unavailable. Please try again later.";
  if (operation === "reset" && error.kind === "validation") return "The reset link is invalid or expired, or the password does not meet requirements.";
  if (operation === "forgot" && error.kind === "validation") return "Enter a valid email address.";
  return "The request could not be completed. Please try again.";
}
export function validateResetPassword(password: string, confirmation: string): string | null {
  if (password.length < 12 || password.length > 128) return "Password must be 12–128 characters.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}
