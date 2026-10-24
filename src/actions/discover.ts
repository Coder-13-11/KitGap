"use server";

// Saving drives people joined on other sites. See src/server/services/external.ts.

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formText, runAction } from "@/server/next/action";
import { saveExternalSignup, updateExternalSignup } from "@/server/services/external";

export async function saveExternalSignupAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async (ctx) => {
    const result = await saveExternalSignup(ctx, {
      url: formText(formData, "url"),
      title: formText(formData, "title"),
      organizer: formText(formData, "organizer"),
      plan: formText(formData, "plan"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    refresh();
    return result;
  });
}

export async function updateExternalSignupAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async (ctx) => {
    const status = formText(formData, "status");
    const result = await updateExternalSignup(ctx, {
      id: formText(formData, "id"),
      status: status || undefined,
      itemsGiven: formData.has("itemsGiven") ? formText(formData, "itemsGiven") : undefined,
      plan: formData.has("plan") ? formText(formData, "plan") : undefined,
    });
    refresh();
    return result;
  });
}
