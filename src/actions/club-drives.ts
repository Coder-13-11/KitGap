"use server";

// A club's own drive and its receipt links. See src/server/services/club-drives.ts.

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import type { ComponentInput } from "@/domain/request-input";
import type { ActionResult } from "@/lib/action-result";
import { formText, runAction } from "@/server/next/action";
import { createClubDrive, issueReceiptLink, reviewDeliveryByReceipt } from "@/server/services/club-drives";

type Result<T = undefined> = Promise<ActionResult<T>>;

// The recipe arrives as parallel lists: components.N.name / quantityPerUnit / details.
function componentsFrom(formData: FormData): ComponentInput[] {
  const rows: ComponentInput[] = [];
  for (let i = 0; i < 20; i++) {
    const name = formData.get(`components.${i}.name`);
    if (name === null) break;
    rows.push({
      name: String(name),
      quantityPerUnit: formText(formData, `components.${i}.quantityPerUnit`),
      details: formText(formData, `components.${i}.details`),
    });
  }
  return rows;
}

export async function createClubDriveAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const groupChoice = formText(formData, "groupId");
    const { commitmentId } = await createClubDrive(ctx, {
      groupId: groupChoice && groupChoice !== "new" ? groupChoice : null,
      newGroup:
        groupChoice === "new" || !groupChoice ? { name: formText(formData, "groupName"), city: formText(formData, "groupCity") } : null,
      recipientName: formText(formData, "recipientName"),
      recipientCity: formText(formData, "recipientCity"),
      title: formText(formData, "title"),
      category: formText(formData, "category"),
      quantity: formText(formData, "quantity"),
      components: componentsFrom(formData),
      neededBy: formText(formData, "neededBy"),
      handoverInstructions: formText(formData, "handoverInstructions"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    redirect(`${ctx.base}/drives/${commitmentId}?started=1`);
  });
}

export async function issueReceiptAction(_prev: unknown, formData: FormData): Result<{ path: string }> {
  return runAction(async (ctx) => {
    const { token } = await issueReceiptLink(ctx, { deliveryId: formText(formData, "deliveryId") });
    refresh();
    return { path: `${ctx.base}/receipt/${token}` };
  });
}

export async function reviewByReceiptAction(_prev: unknown, formData: FormData): Result<{ accepted: number; notAccepted: number }> {
  return runAction(async (ctx) => {
    const decision = formText(formData, "decision");
    const quantity = formText(formData, "deliveredQuantity");
    const result = await reviewDeliveryByReceipt(ctx, {
      token: formText(formData, "token"),
      accepted: decision === "all" ? quantity : formText(formData, "accepted"),
      notAccepted: decision === "all" ? "0" : undefined,
      note: formText(formData, "note"),
      signedName: formText(formData, "signedName"),
    });
    refresh();
    return { accepted: result.accepted, notAccepted: result.notAccepted };
  });
}
