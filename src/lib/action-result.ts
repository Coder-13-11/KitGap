// What every server action returns to the form that called it.
export type ActionResult<T = unknown> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      code: string;
      message: string;
      fieldErrors: Record<string, string>;
      details?: Record<string, unknown>;
    };

export const IDLE: ActionResult<never> | null = null;
