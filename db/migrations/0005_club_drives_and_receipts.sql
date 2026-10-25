-- A club's own drive for a recipient that isn't on KitGap, and the receipt
-- link that recipient uses to confirm a delivery without an account.
--
-- The recipient is a workspace of kind 'recipient'. It never has members, so
-- the organization review path (which needs membership) can't be used for it,
-- and it never appears where organizations are listed. Its requests are the
-- club's own drives: published so the drive rules apply, but never listed.

alter table workspaces drop constraint workspaces_kind_check;
alter table workspaces add constraint workspaces_kind_check
  check (kind in ('organization', 'group', 'recipient'));

-- How a reviewed delivery was confirmed. Null means by a member of the
-- receiving organization (every delivery reviewed before this migration).
alter table deliveries
  add column confirmed_via text check (confirmed_via in ('receipt')),
  -- SHA-256 of the receipt link's secret. The link itself is shown once.
  add column receipt_token_hash text,
  add column receipt_issued_at timestamptz,
  -- The name the person confirming through the receipt link typed.
  add column receipt_signed_name text check (char_length(receipt_signed_name) between 2 and 120);

create unique index deliveries_receipt_token_idx on deliveries (receipt_token_hash) where receipt_token_hash is not null;

-- A review through the receipt link has no KitGap account behind it, so it
-- records the signed name instead of reviewed_by. Replace the unnamed check
-- from 0001 that required reviewed_by with one that allows either.
do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where t.relname = 'deliveries'
    and n.nspname = current_schema()
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%reviewed_by IS NOT NULL%';
  if constraint_name is null then
    raise exception 'deliveries review check not found';
  end if;
  execute format('alter table deliveries drop constraint %I', constraint_name);
end
$$;

alter table deliveries add constraint deliveries_review_complete check (
  (status = 'reviewed'
    and accepted_quantity >= 0 and not_accepted_quantity >= 0
    and accepted_quantity + not_accepted_quantity = quantity
    and reviewed_at is not null
    and (
      (confirmed_via is null and reviewed_by is not null)
      or (confirmed_via = 'receipt' and reviewed_by is null and receipt_signed_name is not null)
    )
    and (not_accepted_quantity = 0 or char_length(review_note) > 0))
  or
  (status <> 'reviewed'
    and accepted_quantity is null and not_accepted_quantity is null and reviewed_at is null
    and confirmed_via is null)
);
