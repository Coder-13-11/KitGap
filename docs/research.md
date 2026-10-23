# UX research note

## How this research was done, and its limits

This was a time-boxed pass (about 30 minutes). The development environment's network policy **blocked direct access** to every suggested source: nngroup.com, w3.org, design-system.service.gov.uk, rightgift.com, gooddler.com and congressionalappchallenge.us. What follows is based on:

- web search results, which summarize pages but are not the pages themselves; and
- established guidance the build follows from prior knowledge: NN/g's ten usability heuristics, the W3C WAI forms tutorial, and GOV.UK Design System patterns.

No product dashboards were inspected, and no claim here comes from using RightGift, GOODdler or any other product. **Before relying on any detail below, open the original sources yourself.**

## What the sources say (from search results)

**RightGift** (via a partner's virtual-product-drive guide and third-party profiles): a nonprofit gets a personalized wish-list link (a RightGift team member sets up the account), the organizer shares the link, donors buy listed items, and the items ship directly to the nonprofit's partner. Its revenue reportedly comes from retailer commissions, and it's described as free for nonprofits and donors. The search did not surface its "kits" feature or how it shows progress.

**GOODdler** (business-directory listings only): charities, corporate giving programs and individuals create wish lists; donors buy items that are delivered directly to the charity; some of its software is aimed at organizations that collect and manage goods donations. No details on verification, progress tracking or group drives were found.

**Congressional App Challenge 2026** (House office pages, not the official PDF): AI tools are allowed if all use is disclosed, and AI may support only specific parts of the project. Students must be able to explain their own contributions and how the code works. Most sources give the deadline as Monday, October 26, 2026, 12:00 p.m. ET; one office page said 8 p.m. ET. Videos are 1 to 3 minutes, hosted on YouTube or Vimeo. Submissions can't be changed after the deadline. **Check the official rules before submitting.**

**GOV.UK error summary and validation pattern:** always show an error summary when validation fails, even for a single error; move focus to it; link each error to its field; use matching wording next to the field; turn off browser validation (`novalidate`). Accessibility practitioners on the W3C WAI mailing list cautioned against moving focus *and* using a live region for the same error, because screen readers may announce it twice.

**Supabase server-side auth** (third-party guides; the official docs site was also blocked, so the library's own README was read in `node_modules`): validate sessions on the server with `getUser()` or `getClaims()`, not `getSession()`, and refresh the session in middleware (called "proxy" in Next.js 16).

## What this means for KitGap

Goods-donation tools already exist. RightGift and GOODdler let donors buy items from a nonprofit's list and ship them directly. **KitGap doesn't claim to have invented goods donation.** Its proposed focus is narrower and different: turning an approved organizational need into **coordinated drives by school and community groups**, with quantities each group is accountable for and a **confirmed handover**. As far as the search results show, the existing tools focus on individual purchases from a list rather than groups collecting, assembling and delivering complete kits. That's an inference from limited information, not a verified comparison.

## Five design decisions this informed

| # | Decision (proposed) | Informed by |
| --- | --- | --- |
| 1 | **The recipe drives everything.** A request states exactly what goes in one kit; every quantity a group takes on is turned into an exact supply list on the request page, the adoption form and the drive. | Wish-list tools list items one by one; KitGap's group use case needs kit-level requirement clarity (NN/g: match between system and real world; recognition over recall). |
| 2 | **Adopt a quantity, checked against live availability.** Groups choose how many units to take on; the server re-checks under a lock and explains if someone else took some first. Pledges are capped at what's still uncovered. | The gap from decision 1: many groups share one request, so shared quantities must stay accurate (NN/g: error prevention). |
| 3 | **Progress counts only confirmed receipt.** Promised, delivered-awaiting-review and confirmed-received are separate, labelled stages. Pledges and money never count as fulfilled. | Wish-list progress is typically "purchased"; KitGap's distinguishing claim is the confirmed handover (NN/g: visibility of system status, with honest numbers). |
| 4 | **GOV.UK-style forms.** One topic per step, a "check your answers" review step, drafts saved at each step, an error summary that takes focus and links to fields, entries kept on error, and focus rather than a live region for errors. | The GOV.UK validation pattern, the WAI mailing-list discussion, the W3C forms tutorial (labels, fieldsets, instructions). |
| 5 | **Precise confirmations.** The receiving organization decides each delivery once: all accepted, or part accepted with a reason the group sees. The only verification badge says exactly what was checked: "Contact confirmed", explained in plain words. | The brief's requirement for precise badges; NN/g's help-users-recover-from-errors heuristic (the group sees exactly what to fix). |
