// Turns a server operation into a result a form can show. Rule violations
// become field errors and a plain message; anything unexpected is logged on
// the server with a reference code, and the person sees a safe message.

import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { isDomainError } from "@/domain/errors";
import type { ActionResult } from "@/lib/action-result";
import { getAppContext, type AppContext } from "./context";

export async function runAction<T>(work: (ctx: AppContext) => Promise<T>): Promise<ActionResult<T>> {
  let ctx: AppContext | null = null;
  try {
    ctx = await getAppContext();
    const data = await work(ctx);
    return { ok: true, data };
  } catch (error) {
    unstable_rethrow(error);
    if (isDomainError(error)) {
      const expired = error.code === "sign_in_required" && ctx?.sessionExpired;
      return {
        ok: false,
        code: error.code,
        message: expired ? "Your session expired. Sign in again to continue; your answers are still on this page." : error.message,
        fieldErrors: error.fieldErrors,
        details: error.details,
      };
    }
    const reference = randomUUID().slice(0, 8);
    console.error(`[kitgap] action failed (reference ${reference})`, error);
    return {
      ok: false,
      code: "unexpected",
      message: `Something went wrong and nothing was saved. Please try again. If it keeps happening, mention reference ${reference}.`,
      fieldErrors: {},
    };
  }
}

export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
