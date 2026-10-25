// Writing a request's columns and recipe rows. Shared by organization
// requests (requests.ts) and a club's own drive (club-drives.ts).

import type { CleanRequest } from "@/domain/request-input";
import type { Tx } from "../db/client";

export async function writeComponents(tx: Tx, requestId: string, clean: CleanRequest) {
  await tx`delete from request_components where request_id = ${requestId}`;
  for (const [position, component] of clean.components.entries()) {
    await tx`
      insert into request_components ${tx({
        requestId,
        position,
        name: component.name,
        normalizedKey: component.normalizedKey,
        quantityPerUnit: component.quantityPerUnit,
        details: component.details,
      })}
    `;
  }
}

export function requestColumns(clean: CleanRequest) {
  return {
    title: clean.title,
    need: clean.need,
    beneficiaries: clean.beneficiaries,
    category: clean.category,
    requestType: clean.requestType,
    unitName: clean.unitName,
    targetQuantity: clean.targetQuantity,
    conditionNotes: clean.conditionNotes,
    substitutions: clean.substitutions,
    neededBy: clean.neededBy,
    timezone: clean.timezone,
    location: clean.location,
    handoverInstructions: clean.handoverInstructions,
    coordinatorContact: clean.coordinatorContact,
    fundraisingUrl: clean.fundraisingUrl,
  };
}
