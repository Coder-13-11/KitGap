import { describe, expect, it } from "vitest";
import { platformFor } from "@/domain/discovery";
import {
  buildQueries,
  cleanUrl,
  onlyPastYears,
  parseExaText,
  postedFromUrl,
  rankAndFilter,
  seasonFor,
  type RawResult,
} from "@/server/discovery/rank";

const TODAY = new Date("2026-10-24T12:00:00Z");

function raw(url: string, title: string, text = "Drop off donations at the front office.", publishedAt: string | null = null): RawResult {
  return { url, title, text, publishedAt };
}

describe("platformFor", () => {
  it("names the site a drive lives on", () => {
    expect(platformFor("https://www.signupgenius.com/go/10C0A48A9AB2-coat")).toBe("signupgenius");
    expect(platformFor("https://www.justserve.org/projects/abc")).toBe("justserve");
    expect(platformFor("https://m.facebook.com/x/posts/1")).toBe("facebook");
    expect(platformFor("https://salvationarmyorlando.galaxydigital.com/need/detail/?need_id=1")).toBe("salvation_army");
    expect(platformFor("https://www.example.org/drive")).toBe("web");
  });
});

describe("cleanUrl", () => {
  it("keeps https links and strips tracking", () => {
    expect(cleanUrl("https://example.org/drive?utm_source=x&id=4#top")).toBe("https://example.org/drive?id=4");
    expect(cleanUrl("https://www.instagram.com/p/ABC123/?igsh=xyz")).toBe("https://www.instagram.com/p/ABC123/");
  });

  it("rejects pages nobody can sign up on", () => {
    expect(cleanUrl("http://example.org/drive")).toBeNull();
    expect(cleanUrl("https://www.signupgenius.com/findasignup")).toBeNull();
    expect(cleanUrl("https://www.signupgenius.com/")).toBeNull();
    expect(cleanUrl("https://en.wikipedia.org/wiki/Food_drive")).toBeNull();
    expect(cleanUrl("javascript:alert(1)")).toBeNull();
  });

  it("keeps VolunteerMatch listings, which live under /search/", () => {
    expect(cleanUrl("https://www.volunteermatch.org/search/opp3892098.jsp")).toBe("https://www.volunteermatch.org/search/opp3892098.jsp");
  });
});

describe("postedFromUrl", () => {
  it("reads the post time out of Instagram and LinkedIn IDs", () => {
    expect(postedFromUrl("https://www.instagram.com/p/C1r2M8HscOr/")?.slice(0, 10)).toBe("2024-01-04");
    expect(postedFromUrl("https://www.instagram.com/reel/DbYU1N4uuvM/")?.slice(0, 10)).toBe("2026-07-29");
    expect(postedFromUrl("https://www.linkedin.com/posts/acme_coat-drive-activity-7380000000000000000-AbCd")?.slice(0, 10)).toBe("2025-10-03");
    expect(postedFromUrl("https://www.example.org/p/C1r2M8HscOr")).toBeNull();
  });
});

describe("onlyPastYears", () => {
  it("spots drives from a past season", () => {
    expect(onlyPastYears("Toy Drive 2025", 2026)).toBe(true);
    expect(onlyPastYears("Toy Drive 2025 is back for 2026", 2026)).toBe(false);
    expect(onlyPastYears("Coat drive this weekend", 2026)).toBe(false);
  });
});

describe("parseExaText", () => {
  it("splits the text blocks the public endpoint returns", () => {
    const text = [
      "Title: Coat Drive\nURL: https://example.org/coats\nPublished: 2026-10-01T00:00:00.000Z\nAuthor: N/A\nHighlights:\nBring coats to the gym.",
      "Title: Toy Drive\nURL: https://example.org/toys\nPublished: N/A\nAuthor: N/A\nHighlights:\nNew toys only.",
    ].join("\n---\n");
    expect(parseExaText(text)).toEqual([
      { url: "https://example.org/coats", title: "Coat Drive", text: "Bring coats to the gym.", publishedAt: "2026-10-01T00:00:00.000Z" },
      { url: "https://example.org/toys", title: "Toy Drive", text: "New toys only.", publishedAt: null },
    ]);
  });
});

describe("rankAndFilter", () => {
  it("drops old, off-topic and duplicate pages and puts nearby, fresh drives first", () => {
    const out = rankAndFilter(
      [
        raw("https://example.org/far-drive", "Coat drive in Denver", "Donate coats.", "2026-10-10T00:00:00Z"),
        raw("https://example.org/old-post", "Orlando coat drive", "Donate coats.", "2026-08-01T00:00:00Z"),
        raw("https://example.org/near-drive", "Orlando coat drive", "Donate coats in Orlando.", "2026-10-15T00:00:00Z"),
        raw("https://example.org/near-drive/", "Orlando coat drive (again)", "Donate coats.", null),
        raw("https://example.org/last-year", "Orlando Toy Drive 2025", "Donate toys."),
        raw("https://example.org/ancient", "Orlando coat drive", "Donate.", "2025-01-01T00:00:00Z"),
        raw("https://example.org/recipe", "Best pumpkin pie", "Bake it at 350."),
      ],
      "Orlando, FL",
      TODAY,
    );
    expect(out.map((d) => d.url)).toEqual([
      "https://example.org/near-drive",
      "https://example.org/old-post",
      "https://example.org/far-drive",
    ]);
    expect(out[0]).toMatchObject({ near: true, stale: false });
    expect(out[1]).toMatchObject({ near: true, stale: true });
  });
});

describe("buildQueries", () => {
  it("follows the season when no topic is picked", () => {
    expect(seasonFor(TODAY).topic).toContain("holiday");
    expect(seasonFor(new Date("2026-07-10T00:00:00Z")).topic).toContain("school");
    const q = buildQueries("Austin, TX", "", TODAY);
    expect(q.signups.some((s) => s.includes("signupgenius"))).toBe(true);
    expect(q.social.some((s) => s.startsWith("site:facebook.com"))).toBe(true);
    expect(q.more.some((s) => s.includes("Toys for Tots"))).toBe(true);
    expect(Object.values(q).flat().every((s) => s.includes("Austin, TX"))).toBe(true);
  });
});
