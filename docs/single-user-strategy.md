# Useful to one person, better with many

Written October 24, 2026. KitGap today is a two-sided marketplace: a club can only start a drive on a request an organization posted and a reviewer approved. With no organizations on KitGap, a club coordinator who signs up has nothing to do, and an organization that posts a list waits for clubs that aren't there yet. That is the cold-start problem every marketplace has.

The fix is **come for the tool, stay for the network.** Each kind of user should get real value on day one, alone. Every extra person should then make KitGap *better*: more trusted, easier, more visible. Other people should never be what makes it work at all.

## The rule for every idea below

1. **Works alone.** One coordinator, one organization or one student gets something they'd otherwise do in a spreadsheet, a group chat or on paper.
2. **Leaves a trail.** The single-user action produces something that brings in the next person (a link, a receipt, a printed tag), without spam.
3. **Keeps the honesty rules.** A pledge is never collected, only the recipient confirms, and no names appear on public pages. More users mean more *trust*, never looser rules.

## Decided: two tiers of confirmation

A club running its own drive may hand kits to a recipient that isn't on KitGap. The recipient confirms through a receipt link or QR code with no account. Because the club holds that link, the confirmation is labelled for what it is:

| Who confirmed | Label | Where it counts |
| --- | --- | --- |
| A KitGap-verified organization (contact confirmed by a reviewer) | **Confirmed** (forest stamp) | The drive, the request, public records and totals |
| A recipient through a receipt link | **Confirmed by recipient** (outlined stamp, with the recipient's name and the date) | The drive, the club's record (labelled), and the student's hours log |

The network effect is now visible: when a recipient organization joins and is verified, its earlier receipt-link confirmations can be upgraded to full **Confirmed**. More organizations on KitGap means more fully trusted numbers.

## Brainstorm: value for one person

Ideas are ranked by impact for a lone user divided by effort. "Builds on" names what already exists in the code.

### For a club coordinator (the most important single user)

| # | Idea | Why one person cares | Network bonus | Builds on | Effort |
| --- | --- | --- | --- | --- | --- |
| C1 | **Run your own drive.** Pick a template or write the kit recipe, name the recipient (any shelter, school or pantry, on KitGap or not), set the number of kits. | Replaces the spreadsheet and group chat on day one. | A recipient later on KitGap can take the drive over as a real request. | Request templates, drive page, supply checklist, invites, pledges, packing, delivery | M–L |
| C2 | **Receipt link / QR at handover.** The recipient opens it on a phone, sees what's being handed over, accepts all or part with a reason. No account needed. | Proof the drive happened, in the recipient's words. | Every receipt shows an organization what KitGap is: the main growth loop. | Delivery review (`reviewDelivery`), two-tier labels above | M |
| C3 | **No-account pledge link.** Members pledge with a first name only (no sign-up), suitable for students under 13. | Replaces SignUpGenius for the club. | Contributors who come back can claim their pledges with an account. | Guest pledges already exist for imports (`guest_name`) | S–M |
| C4 | **Service-hours log.** Each member's pledges delivered, packing sessions and handovers become a log they can print for their counselor. The hours are backed by the recipient's confirmation. | Florida Bright Futures needs 75–100 volunteer hours, documented and verified by the organization served ([Florida Lottery](https://floridalottery.com/education/bright-futures), [Pinellas schools](https://phuhs.pcsb.org/resources/school-counselors/bright-futures-volunteer-servicepaid-work)). A real reason for each *student* to use KitGap. | Hours confirmed by a verified organization carry more weight than self-reported ones. | Activity log, confirmations, the "where your items went" journey | M |
| C5 | **Printable kit tags.** One tag per packed kit ("Kit 7 of 20 · Lakeside → Riverbend"), with a QR code to the receipt. Shaped like the logo. | Makes packing day organized and photogenic. | The tag travels with the kit to the recipient and explains KitGap there. | Packing sheet, QR code (`qrcode` package) | S |
| C6 | **Collection-day check-in mode.** A phone screen with big +1 buttons per item and an optional photo count. | Fastest way to record a table of donations. | None needed; purely single-user. | Record supplies, Count with a photo | S–M |
| C7 | **Impact certificate.** After confirmation, a one-page PDF and image for the school newsletter, club records and college applications. | Recognition for the club and its members. | Shared certificates bring in new clubs. | Confirmed record pages | S |
| C8 | **Run it again next year.** Copy last year's drive with its recipe, recipient and members. | Saves setup for recurring drives. | Organizations see a club's track record. | `copyRequest` | S |

### For an organization working alone

| # | Idea | Why one org cares | Network bonus | Builds on | Effort |
| --- | --- | --- | --- | --- | --- |
| O1 | **Needs list you can share anywhere.** A public page plus a printable flyer with QR, for the org's own volunteers, church, PTA or social media, even if no KitGap club exists. | Stops the "second disaster" of unwanted goods at the source. | Clubs near the org find the list in the directory. | Public request page, share page | S |
| O2 | **"We have enough of this" switch.** Mark an item as full and every link updates instantly. | The thing staff most want after a disaster or a viral post. | Clubs mid-drive see it right away. | Request components, published-details editing | S–M |
| O3 | **Intake log for any donation.** Record what arrives from anyone (walk-ins too) against the list, and see what's still missing. | Replaces the whiteboard. | Deliveries from KitGap clubs arrive pre-counted. | Collection entries, quantity model | M |
| O4 | **In-kind thank-you letters.** A printable acknowledgment listing the items received, with no dollar values (KitGap never handles money). | Saves staff time on thanks. | Donors learn where to give next time. | Delivery reviews | S |
| O5 | **Impact report for grants.** Confirmed kits by month and category, exportable. | Grant writers need these numbers. | More clubs means more confirmed numbers. | Confirmed records, CSV export | S |

### For a contributor (parent, neighbor, student)

| # | Idea | Why one person cares | Network bonus | Builds on | Effort |
| --- | --- | --- | --- | --- | --- |
| P1 | **"What should I bring?" card.** After pledging: the item, the drop-off date and place (shared only with the pledger), and an add-to-calendar file. | Remembering is the hard part. | None needed. | Pledge flow, drive handover details | S |
| P2 | **Where my items went.** Follow your notebooks from pledged to confirmed. | Specific impact is what makes people give again (Cryder et al., 2013). | Already built. | `donationJourney` | Done |

## What "more users make it better" looks like

None of these are needed for KitGap to be useful. Each one makes it better:

- **Verified organizations:** receipt confirmations upgrade to full **Confirmed**.
- **Directory and matching:** a club sees requests near it, and an organization sees clubs near it.
- **Shared requests:** several clubs split one 100-kit request, with live availability and locks so nobody double-claims (built).
- **Track records:** a club's confirmed history helps organizations decide whom to trust.
- **Recipes that work:** templates learn from confirmed drives ("most hygiene kits that were accepted had these five items").
- **What's short nearby:** a public view of the items most needed in a city, from confirmed lists only.

## Recommended order

| Order | Build | Why first |
| --- | --- | --- |
| 1 | **C1 + C2** (run your own drive with a receipt link, two-tier labels) | Removes the cold start for the most important user. Every other idea needs it. |
| 2 | **C3** (no-account pledge link) | Makes a lone coordinator's drive work for members who won't sign up. |
| 3 | **C4** (service-hours log) | A reason for every student in the club to use it, not just the coordinator. Unusually strong for a Florida judge panel. |
| 4 | **O1 + O2** (shareable needs list, "we have enough" switch) | A reason for a lone organization to post. |
| 5 | **C5, C7** (kit tags, certificate) | Cheap, visual, and great in the demo video. |

### C1 + C2: built October 24

As built, the recipient is a workspace of kind `recipient` with no members, and its request is the club's drive. The tier comes from that kind, so requests needed no new column. Migration `0005_club_drives_and_receipts.sql` adds the kind, the receipt fields on deliveries, and a review check that accepts either a KitGap reviewer or a receipt signature. Services are in `src/server/services/club-drives.ts`, and tests in `tests/integration/club-drives.test.ts`. The plan below is kept for reference.

#### The original plan

- **Migration 0005**:
  - Requests gain a `kind` of `organization` (today) or `club_drive`, plus a free-text recipient (`recipient_name`, `recipient_city`) for `club_drive`.
  - A `club_drive` request is never listed in the directory and skips reviewer approval (nothing public to approve). Its owner is the club.
  - Deliveries gain `confirmed_via` (`organization` or `receipt_link`) and a hashed one-time `receipt_token`.
- **Services**:
  - `createClubDrive`: the club creates the request and its own commitment in one `mutate()`.
  - `issueReceiptLink`: hashes and stores the token, and the plain link is shown once.
  - `reviewDeliveryByReceipt`: the same rules as `reviewDelivery`, plus a check that the person reviewing isn't a member of the club.
  - Quantity rules stay unchanged.
- **Pages**:
  - "Run your own drive" on the club's home.
  - A public `/receipt/[token]` page, readable on a phone, with no account.
  - The outlined "Confirmed by recipient" stamp.
- **Tests**:
  - A club drive never appears in the directory.
  - A receipt link can't be used twice.
  - A club member can't confirm through the link while signed in.
  - A receipt confirmation shows the recipient tier and never the verified stamp.
  - Totals still obey `docs/quantity-model.md`.
- **Honest limit**: a receipt link proves someone with the link confirmed. That's why it's a separate tier. Write this into `docs/limitations.md` when it ships.

## Built today (October 24)

- **Logo in color**: forest tag, manila label with two item lines, marigold eyelet, rust twine. The favicon and share images use the same drawing.
- **Packing animation on every screen change**, drawn from the logo. Items drop into a box, the flaps fold, the tag swings on and its hole fills forest. It replaces the gray loading skeletons, and with reduced motion it shows the packed box without moving.
