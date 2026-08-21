export type AdminAppErrorKind =
  | "network"
  | "timeout"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server"
  | "unknown";

export interface ValidationIssue {
  path: string;
  message: string;
}

export class AdminAppError extends Error {
  readonly kind: AdminAppErrorKind;
  readonly status?: number;
  readonly issues?: ValidationIssue[];

  constructor(kind: AdminAppErrorKind, message: string, options: { status?: number; issues?: ValidationIssue[]; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "AdminAppError";
    this.kind = kind;
    this.status = options.status;
    this.issues = options.issues;
  }
}
