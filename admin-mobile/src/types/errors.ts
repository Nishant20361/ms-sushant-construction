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
  readonly retryAfter?: number;
  readonly lockedUntil?: string;
  readonly require2FA?: boolean;
  readonly tempToken?: string;
  readonly maskedEmail?: string;

  constructor(
    kind: AdminAppErrorKind,
    message: string,
    options: {
      status?: number;
      issues?: ValidationIssue[];
      cause?: unknown;
      retryAfter?: number;
      lockedUntil?: string;
      require2FA?: boolean;
      tempToken?: string;
      maskedEmail?: string;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "AdminAppError";
    this.kind = kind;
    this.status = options.status;
    this.issues = options.issues;
    this.retryAfter = options.retryAfter;
    this.lockedUntil = options.lockedUntil;
    this.require2FA = options.require2FA;
    this.tempToken = options.tempToken;
    this.maskedEmail = options.maskedEmail;
  }
}
