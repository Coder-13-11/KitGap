-- Drives people join on other sites -----------------------------------------

-- A person's own note that they signed up for a drive found through
-- Discover (a SignUpGenius sheet, a Facebook post, a Salvation Army page...).
-- KitGap can't see other sites, so this is what the person tells us. The
-- drive's details are copied here because the page may change or vanish.
create table external_signups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  url text not null check (url ~ '^https://' and char_length(url) <= 2000),
  title text not null check (char_length(title) between 1 and 300),
  platform text not null check (char_length(platform) <= 40),
  organizer text not null default '' check (char_length(organizer) <= 200),
  status text not null default 'signed_up' check (status in ('signed_up', 'donated', 'cancelled')),
  -- What the person plans to bring, in their own words.
  plan text not null default '' check (char_length(plan) <= 300),
  -- How many items they brought, once they say they donated.
  items_given integer check (items_given between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, url)
);

create index external_signups_user_idx on external_signups (user_id, created_at desc);

-- Sign-ups brought in from Google Forms, SignUpGenius or a spreadsheet ---------

-- One record per import, for the activity log and "undo" later.
create table import_batches (
  id uuid primary key,
  commitment_id uuid not null references commitments (id),
  source text not null check (source in ('google_forms_csv', 'signupgenius_csv', 'spreadsheet')),
  file_name text not null default '' check (char_length(file_name) <= 200),
  created_count integer not null check (created_count >= 0),
  skipped_count integer not null check (skipped_count >= 0),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create index import_batches_commitment_idx on import_batches (commitment_id, created_at desc);

-- Imported contributors don't have KitGap accounts. Their pledge carries a
-- name (and maybe an email, seen only by the drive's coordinators) instead.
alter table pledges alter column user_id drop not null;
alter table pledges
  add column guest_name text check (char_length(guest_name) between 1 and 120),
  add column guest_email text check (char_length(guest_email) <= 254),
  add column import_source text check (import_source in ('google_forms_csv', 'signupgenius_csv', 'spreadsheet')),
  add column source_row_id text check (char_length(source_row_id) between 1 and 200),
  add column import_batch_id uuid references import_batches (id);

alter table pledges
  add constraint pledges_owner check ((user_id is null) = (guest_name is not null)),
  add constraint pledges_import_fields check (
    (import_source is null and source_row_id is null and import_batch_id is null)
    or (import_source is not null and source_row_id is not null and import_batch_id is not null)
  ),
  add constraint pledges_guest_imported check (guest_name is null or import_source is not null);

-- Importing the same row again never makes a second pledge.
create unique index pledges_import_row_unique
  on pledges (commitment_id, import_source, source_row_id)
  where import_source is not null;


-- Same rule as 0001: the browser never reads these tables directly.
alter table external_signups enable row level security;
alter table import_batches enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute format('revoke all on all tables in schema %I from anon, authenticated', current_schema());
  end if;
end
$$;
