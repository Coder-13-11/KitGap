import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isDomainError } from "@/domain/errors";
import { getDriveWorkspace } from "@/server/queries/drives";
import { adoptRequest } from "@/server/services/drives";
import { connectFormWebhook, ingestFormWebhook } from "@/server/services/webhooks";
import { createHarness, standardScenario, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.close();
});

async function drive(quantity = 20) {
  const s = await standardScenario(h);
  const { commitmentId } = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity });
  return { ...s, commitmentId };
}

function payload(over: Record<string, unknown> = {}) {
  return {
    responseId: "resp-1",
    answers: {
      "Your name": "Ana Sample",
      "What will you bring?": "Notebooks",
      "How many?": "6",
      "Email Address": "ana.sample@example.com",
      ...over,
    },
  };
}

describe("Google Forms webhook", () => {
  it("creates a guest pledge from a valid response", async () => {
    const s = await drive();
    const { secret } = await connectFormWebhook(h.as(s.coordA), { commitmentId: s.commitmentId });
    const result = await ingestFormWebhook(h.as(null), secret, payload());
    expect(result).toMatchObject({ created: 1, quantity: 6, overCap: 0 });
    const view = await getDriveWorkspace(h.as(s.coordA), s.commitmentId);
    if (!view || view === "not_allowed") throw new Error("missing drive");
    expect(view.pledges).toHaveLength(1);
    expect(view.pledges[0]).toMatchObject({ contributorName: "Ana S.", quantity: 6, imported: { source: "Google Forms", email: "ana.sample@example.com" } });
    expect(view.progress.components.find((c) => c.name === "Notebook")?.collected).toBe(0);
  });

  it("rejects a bad secret without creating a pledge", async () => {
    const s = await drive();
    await connectFormWebhook(h.as(s.coordA), { commitmentId: s.commitmentId });
    await expect(ingestFormWebhook(h.as(null), "this-is-not-the-real-secret-value", payload({}))).rejects.toMatchObject({ code: "not_found" });
    const view = await getDriveWorkspace(h.as(s.coordA), s.commitmentId);
    if (!view || view === "not_allowed") throw new Error("missing drive");
    expect(view.pledges).toEqual([]);
  });

  it("does not duplicate the same response id", async () => {
    const s = await drive();
    const { secret } = await connectFormWebhook(h.as(s.coordA), { commitmentId: s.commitmentId });
    await ingestFormWebhook(h.as(null), secret, payload());
    const again = await ingestFormWebhook(h.as(null), secret, payload({ "How many?": "3" }));
    expect(again.created).toBe(0);
    const view = await getDriveWorkspace(h.as(s.coordA), s.commitmentId);
    if (!view || view === "not_allowed") throw new Error("missing drive");
    expect(view.pledges).toHaveLength(1);
    expect(view.pledges[0].quantity).toBe(6);
  });

  it("reports a row over the remaining need instead of creating it", async () => {
    const s = await drive(2);
    const { secret } = await connectFormWebhook(h.as(s.coordA), { commitmentId: s.commitmentId });
    const result = await ingestFormWebhook(h.as(null), secret, payload({ "What will you bring?": "Backpacks", "How many?": "30" }));
    expect(result).toMatchObject({ created: 0, overCap: 1 });
    const view = await getDriveWorkspace(h.as(s.coordA), s.commitmentId);
    if (!view || view === "not_allowed") throw new Error("missing drive");
    expect(view.pledges).toEqual([]);
  });

  it("does not let a contributor connect a form", async () => {
    const s = await drive();
    try {
      await connectFormWebhook(h.as(s.contributor), { commitmentId: s.commitmentId });
      throw new Error("should have been refused");
    } catch (error) {
      expect(isDomainError(error) && error.code === "not_allowed").toBe(true);
    }
  });
});
