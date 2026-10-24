import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDriveWorkspace, getPublicDrive, type DriveWorkspace } from "@/server/queries/drives";
import { adoptRequest } from "@/server/services/drives";
import { importPledges, previewImport } from "@/server/services/imports";
import { createPledge } from "@/server/services/supplies";
import { createHarness, standardScenario, type Harness } from "./harness";

const fixture = (name: string) => readFileSync(path.join(import.meta.dirname, "../fixtures", name), "utf8");
const GOOGLE = fixture("google-forms-sample.csv");
const SUG = fixture("signupgenius-sample.csv");

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

async function workspace(userId: string, commitmentId: string): Promise<DriveWorkspace> {
  const drive = await getDriveWorkspace(h.as(userId), commitmentId);
  if (!drive || drive === "not_allowed") throw new Error(`drive not visible: ${drive}`);
  return drive;
}

const line = (drive: DriveWorkspace, name: string) => drive.progress.components.find((c) => c.name === name)!;

async function setup(quantity = 20) {
  const s = await standardScenario(h);
  const { commitmentId } = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity });
  return { ...s, commitmentId };
}

async function previewAndImport(userId: string, commitmentId: string, csv: string, patch: Record<string, unknown> = {}) {
  const preview = await previewImport(h.as(userId), { commitmentId, csv });
  return importPledges(h.as(userId), {
    commitmentId,
    csv,
    mapping: { ...preview.mapping, ...patch },
    source: preview.source,
    fileName: "responses.csv",
    idempotencyKey: randomUUID(),
  });
}

describe("importing sign-ups", () => {
  it("previews a Google Forms download without saving anything", async () => {
    const s = await setup();
    const preview = await previewImport(h.as(s.coordA), { commitmentId: s.commitmentId, csv: GOOGLE });
    expect(preview.source).toBe("google_forms_csv");
    expect(preview.plan.create).toHaveLength(5);
    expect(preview.plan.overCap).toHaveLength(1);
    expect(preview.plan.errors).toHaveLength(2);
    expect(preview.plan.duplicates).toHaveLength(1);
    expect(preview.answers.find((a) => a.text === "Glue sticks")?.suggested).toBeNull();
    const drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.pledges).toHaveLength(0);
  });

  it("adds guest pledges that are promises, not collected supplies", async () => {
    const s = await setup();
    const result = await previewAndImport(s.coordA, s.commitmentId, GOOGLE);
    expect(result).toMatchObject({ created: 5, quantity: 15, overCap: 1, errors: 2, duplicates: 1 });

    const drive = await workspace(s.coordA, s.commitmentId);
    expect(line(drive, "Notebook")).toMatchObject({ collected: 0, openPledged: 8, uncovered: 32 });
    expect(line(drive, "Backpack")).toMatchObject({ collected: 0, openPledged: 2, uncovered: 18 });
    expect(line(drive, "Pencil pack")).toMatchObject({ collected: 0, openPledged: 5, uncovered: 15 });
    expect(drive.progress.supportedByCollected).toBe(0);
    expect(drive.pledges.map((p) => p.contributorName).sort()).toEqual(["Ana S.", "Ben E.", "Cara T.", "Cara T.", "Gus"]);
    expect(drive.pledges.every((p) => p.imported?.source === "Google Forms" && p.imported.email === null)).toBe(true);
    expect(drive.activity[0].text).toMatch(/imported 5 pledges \(15 items\) from Google Forms; left out 1 row asking for more than was still needed/);
  });

  it("never duplicates a row when the same file is imported again", async () => {
    const s = await setup();
    await previewAndImport(s.coordA, s.commitmentId, GOOGLE);
    const again = await previewAndImport(s.coordA, s.commitmentId, GOOGLE);
    expect(again).toMatchObject({ batchId: null, created: 0, duplicates: 6 });
    const drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.pledges).toHaveLength(5);
  });

  it("returns the first result when the same confirmation is sent twice", async () => {
    const s = await setup();
    const preview = await previewImport(h.as(s.coordA), { commitmentId: s.commitmentId, csv: SUG });
    const input = { commitmentId: s.commitmentId, csv: SUG, mapping: preview.mapping, source: preview.source, idempotencyKey: randomUUID() };
    const first = await importPledges(h.as(s.coordA), input);
    const second = await importPledges(h.as(s.coordA), input);
    expect(second).toEqual(first);
    expect((await workspace(s.coordA, s.commitmentId)).pledges).toHaveLength(4);
  });

  it("checks the cap again at import time, against pledges made after the preview", async () => {
    const s = await setup(5);
    const preview = await previewImport(h.as(s.coordA), { commitmentId: s.commitmentId, csv: SUG });
    // 2 backpacks, 10 notebooks and 5 pencil packs fit; Kai's 4 notebooks don't.
    expect(preview.plan.create.map((p) => p.quantity)).toEqual([2, 10, 5]);
    expect(preview.plan.overCap).toHaveLength(1);
    const drive = await workspace(s.coordA, s.commitmentId);
    const backpack = drive.components.find((c) => c.name === "Backpack")!.id;
    await createPledge(h.as(s.contributor), { commitmentId: s.commitmentId, componentId: backpack, quantity: 4 });
    const result = await importPledges(h.as(s.coordA), {
      commitmentId: s.commitmentId,
      csv: SUG,
      mapping: preview.mapping,
      source: preview.source,
      idempotencyKey: randomUUID(),
    });
    expect(result).toMatchObject({ created: 2, overCap: 2 });
    expect(line(await workspace(s.coordA, s.commitmentId), "Backpack")).toMatchObject({ openPledged: 4, uncovered: 1 });
  });

  it("keeps emails only when the coordinator asks, and shows them only to coordinators", async () => {
    const s = await setup();
    await previewAndImport(s.coordA, s.commitmentId, SUG, { keepEmails: true });
    const coordinatorView = await workspace(s.coordA, s.commitmentId);
    expect(coordinatorView.pledges.map((p) => p.imported?.email).filter(Boolean).sort()).toEqual([
      "hana.sample@example.com",
      "ivan.sample@example.com",
      "kai.sample@example.com",
    ]);
    const contributorView = await workspace(s.contributor, s.commitmentId);
    expect(contributorView.pledges).toEqual([]);
    const publicView = await getPublicDrive(h.as(null), s.commitmentId);
    expect(JSON.stringify(publicView)).not.toMatch(/example\.com|Hana|Ivan/);
  });

  it("only lets the drive's coordinators import", async () => {
    const s = await setup();
    for (const who of [s.contributor, s.outsider, s.coordB, s.orgManager]) {
      await expect(previewImport(h.as(who), { commitmentId: s.commitmentId, csv: GOOGLE })).rejects.toThrow(/Only the drive's coordinators/);
    }
    await expect(
      importPledges(h.as(s.contributor), { commitmentId: s.commitmentId, csv: GOOGLE, mapping: {}, source: "google_forms_csv" }),
    ).rejects.toThrow(/Only the drive's coordinators/);
  });

  it("rejects files that aren't sign-up lists", async () => {
    const s = await setup();
    await expect(previewImport(h.as(s.coordA), { commitmentId: s.commitmentId, csv: "" })).rejects.toThrow(/Choose a CSV file/);
    await expect(previewImport(h.as(s.coordA), { commitmentId: s.commitmentId, csv: "Name,Item\n" })).rejects.toThrow(/no sign-ups yet/);
  });
});
