// A rule violation that is safe to show to the person who caused it. Anything
// else that goes wrong is logged on the server and replaced with a generic
// message, so raw database errors never reach the browser.

export type DomainErrorCode =
  | "invalid_input"
  | "not_found"
  | "not_allowed"
  | "sign_in_required"
  | "conflict" // the shared state changed; the person should review and retry
  | "closed";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly fieldErrors: Record<string, string>;
  readonly details: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    options: { fieldErrors?: Record<string, string>; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.details = options.details ?? {};
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
