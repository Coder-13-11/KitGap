# How KitGap counts

Every number KitGap shows is computed from records, never from a stored running total. The rules live in one place, `src/domain/quantities.ts`, and are tested in `tests/unit/quantities.test.ts` and the integration tests.

## The records

| Record | Created when | Table |
| --- | --- | --- |
| Request and its recipe | An organization posts a need | `requests`, `request_components` |
| Commitment (a "drive") | A group adopts part of a request | `commitments` |
| Pledge | A member promises to bring some of one item | `pledges` |
| Collection entry | A coordinator records items that physically arrived | `collection_entries` |
| Kit movement | A coordinator packs, unpacks, repairs or sets aside kits | `kit_movements` |
| Delivery | A group reports handing units over | `deliveries` |
| Review (on the delivery) | The receiving organization decides once: accepted / not accepted | `deliveries` |
| Activity | Anything above happens | `activity` |

A "unit" is one kit, or one item for a single-item request.

## The request: what's available to adopt

For a request with target **T**:

- **accepted** = sum of accepted quantities in reviewed deliveries.
- For each drive with commitment **q** and accepted units **a**:
  - while **active**, it reserves **q − a** (this includes units in deliveries awaiting review);
  - once **withdrawn**, it reserves only the units in deliveries still awaiting review.
- **reserved** = the sum over all drives.
- **available** = max(0, T − accepted − reserved).

Worked example (the one from the brief, checked in `tests/unit/quantities.test.ts` and `tests/integration/drives.test.ts`):

| Step | accepted | reserved | available |
| --- | --- | --- | --- |
| Target 100; group A adopts 20, group B adopts 30 | 0 | 20 + 30 = 50 | 50 |
| The organization accepts 5 kits from A | 5 | 15 + 30 = 45 | 50 |
| A withdraws (its remaining 15 are released) | 5 | 0 + 30 = 30 | 65 |

Withdrawal while a delivery is pending: A (20) has a delivery of 8 awaiting review and withdraws. The 12 not handed over are released at once; the 8 stay reserved (available 62) until the organization decides. If it accepts 6 and not 2, accepted becomes 6, the 2 are released, and available becomes 64.

**Fulfilled** means accepted ≥ T. "Fully committed" (nothing left to adopt) and "delivered, awaiting review" are separate states with separate labels.

## A drive: supplies and kits

Per item (component) of the recipe, with **p** = quantity per kit:

- **needed** = p × q
- **collected** = usable quantity in non-voided collection entries (unusable items are recorded but never counted)
- **pledged, on the way** = open pledges minus what has already arrived against them
- **still needed** = what nobody has collected or pledged yet, for the kits still to build

Kits move between stages that never overlap:

```
built (packed − unpacked; for items: usable collected)
  = ready to hand over
  + delivered, awaiting review
  + confirmed received
  + not accepted, needs follow-up
  + set aside
```

- Packing takes p of each item per kit out of the unallocated pile; it is limited by the scarcest item: **floor(unallocated ÷ p)**, minimum over items, and by the kits the commitment still needs.
- **supported by collected** (total kits the collected supplies make, including those already packed) is shown separately from **packable now** (more kits from unpacked supplies). The two are never added together.
- A delivery is limited to what is ready and still needed by the commitment.
- Not-accepted units go to "needs follow-up". The coordinator either repairs them (back to ready) or sets them aside (then packs replacements).
- Pledges never change collected totals. Money never changes anything: KitGap has no money fields.

Example: collected 20 backpacks, 30 notebooks, 20 pencil packs; recipe 1 : 2 : 1 → min(20, 15, 20) = **15 kits**. The page says "10 more notebooks complete the remaining 20 kits."

## The rules that keep this true

`driveInvariantViolations` and `requestInvariantViolations` list the states that must never exist (for example, more kits handed over than were ready, or accepted + reserved above the target). After every change, the server reloads the records and checks these inside the same transaction. A violation rolls the change back.

## Concurrency: why two groups can't take the same last 10 kits

Every change that affects a request's numbers starts by locking that request's row (`select … for update` in `loadRequestState`). A second transaction for the same request waits until the first commits, then reads the new numbers and is told how many are left.

We checked that this matters: with the lock removed, the test "lets only one of two simultaneous adoptions of the last 10 kits succeed" fails (both succeed). With the lock, it passes.

The invariant check alone would not catch this race, because each transaction would only see its own change. The lock is what prevents it.

## Retries and double clicks

Forms send a random **idempotency key**. The server records the key in the same transaction as the change. If the same submission arrives again (double click, flaky network), the server returns the first result instead of acting twice. Two identical submissions arriving at the same moment are serialized by the key's unique index. A failed attempt stores nothing, so it can be retried. This is tested in `tests/integration/drives.test.ts` and `supplies.test.ts`.

## Dates

Needed-by dates are calendar dates (`date` column, kept as `"YYYY-MM-DD"` strings in code) in the organization's timezone. "Today" is computed in that timezone. New drives can start through the end of the needed-by day. Nothing converts these dates through UTC.
