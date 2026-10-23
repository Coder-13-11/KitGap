-- KitGap core schema.
--
-- This file is applied by scripts/migrate.ts with search_path set to the
-- target schema ("kitgap" for the real app, "kgdemo_<id>" for a demo sandbox),
-- so it must never qualify table names with a schema.
--
-- Quantities are never stored as running counters. Every total shown in the
-- app (accepted, reserved, available, collected, packed...) is derived from
-- the records below by the functions in src/domain. See docs/quantity-model.md.

-- People ---------------------------------------------------------------------

-- One row per person. For the real app the id is the Supabase Auth user id.
-- Email and password stay in Supabase Auth and are never copied here.
create table profiles (
  id uuid primary key,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);

-- KitGap reviewers. Rows are only ever added with SQL by the people running
-- KitGap (see docs/setup.md); nothing in the app UI can grant this.
create table platform_admins (
  user_id uuid primary key references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Workspaces -----------------------------------------------------------------

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('organization', 'group')),
  -- Public display information.
  name text not null check (char_length(name) between 2 and 120),
  city text not null check (char_length(city) between 2 and 120),
  about text not null default '' check (char_length(about) <= 1000),
  -- Private contact details, shown only to workspace members and reviewers.
  contact_name text not null default '' check (char_length(contact_name) <= 120),
  contact_email text not null default '' check (char_length(contact_email) <= 200),
  contact_phone text not null default '' check (char_length(contact_phone) <= 40),
  -- Set only by a KitGap reviewer after confirming the contact is real.
  contact_confirmed_at timestamptz,
  contact_confirmed_by uuid references profiles (id),
  -- Secret token for the member invitation link. Rotating it disables old links.
  invite_token text not null unique,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  check (kind = 'organization' or contact_confirmed_at is null)
);

create table workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  -- admin: organization manager / group coordinator. member: contributor.
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on workspace_members (user_id);

-- Requests -------------------------------------------------------------------

create table requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references workspaces (id),
  title text not null check (char_length(title) between 5 and 140),
  need text not null default '' check (char_length(need) <= 2000),
  beneficiaries text not null default '' check (char_length(beneficiaries) <= 500),
  category text not null check (
    category in ('school_supplies', 'hygiene', 'winter', 'baby', 'food', 'other')
  ),
  request_type text not null check (request_type in ('kit', 'item')),
  -- What one requested unit is called: "kit", "hygiene kit", "notebook"...
  unit_name text not null check (char_length(unit_name) between 1 and 60),
  -- Null only while a draft is unfinished.
  target_quantity integer check (target_quantity between 1 and 100000),
  condition_notes text not null default '' check (char_length(condition_notes) <= 1000),
  substitutions text not null default '' check (char_length(substitutions) <= 1000),
  -- A calendar date in the organization's timezone, never converted to UTC.
  needed_by date,
  timezone text not null default 'America/New_York',
  -- General city or region, public.
  location text not null default '' check (char_length(location) <= 120),
  -- Private: shown only to the organization and groups with a drive.
  handover_instructions text not null default '' check (char_length(handover_instructions) <= 2000),
  coordinator_contact text not null default '' check (char_length(coordinator_contact) <= 300),
  -- Optional external fundraising page. KitGap never tracks money.
  fundraising_url text check (
    fundraising_url is null or (fundraising_url ~ '^https://' and char_length(fundraising_url) <= 500)
  ),
  status text not null default 'draft' check (
    status in ('draft', 'in_review', 'published', 'closed', 'cancelled')
  ),
  -- Reviewer feedback when a draft is returned, or the closing explanation.
  status_note text not null default '' check (char_length(status_note) <= 1000),
  submitted_at timestamptz,
  published_at timestamptz,
  reviewed_by uuid references profiles (id),
  closed_at timestamptz,
  cancelled_at timestamptz,
  copied_from uuid references requests (id),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Anything that can be seen by the public must be complete.
  check (status = 'draft' or (needed_by is not null and target_quantity is not null and char_length(need) >= 20 and char_length(beneficiaries) >= 5 and char_length(location) >= 2))
);

create index requests_org_idx on requests (org_id);
create index requests_status_idx on requests (status);

-- The recipe. A kit request has one row per component. An item request has
-- exactly one row whose quantity_per_unit is 1.
create table request_components (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  position integer not null check (position >= 0),
  name text not null check (char_length(name) between 1 and 80),
  -- Lower-cased, whitespace-collapsed name used to catch duplicate entries.
  normalized_key text not null,
  quantity_per_unit integer not null check (quantity_per_unit between 1 and 1000),
  details text not null default '' check (char_length(details) <= 300),
  unique (request_id, normalized_key),
  unique (request_id, position)
);

-- Drives ---------------------------------------------------------------------

-- A group's commitment to a number of units of a request. The "drive" in the
-- UI is the commitment plus everything recorded against it.
create table commitments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id),
  group_id uuid not null references workspaces (id),
  quantity integer not null check (quantity >= 1),
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  withdrawn_at timestamptz,
  withdrawn_by uuid references profiles (id),
  withdraw_note text not null default '' check (char_length(withdraw_note) <= 1000),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  check ((status = 'withdrawn') = (withdrawn_at is not null))
);

-- A group holds at most one active drive per request; it changes the quantity
-- of that drive instead of starting a second one.
create unique index commitments_one_active_per_group
  on commitments (request_id, group_id) where status = 'active';
create index commitments_request_idx on commitments (request_id);
create index commitments_group_idx on commitments (group_id);

-- A contributor's promise to bring some of one component. It is an intention,
-- not proof of anything: only collection entries count as collected.
create table pledges (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments (id),
  component_id uuid not null references request_components (id),
  user_id uuid not null references profiles (id),
  quantity integer not null check (quantity between 1 and 100000),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_reason text check (closed_reason in ('withdrawn', 'released')),
  closed_by uuid references profiles (id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'closed') = (closed_at is not null and closed_reason is not null))
);

create index pledges_commitment_idx on pledges (commitment_id);

-- Goods a coordinator has physically received and checked.
create table collection_entries (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments (id),
  component_id uuid not null references request_components (id),
  pledge_id uuid references pledges (id),
  usable_quantity integer not null check (usable_quantity >= 0),
  unusable_quantity integer not null default 0 check (unusable_quantity >= 0),
  note text not null default '' check (char_length(note) <= 300),
  recorded_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references profiles (id),
  void_reason text not null default '' check (char_length(void_reason) <= 300),
  check (usable_quantity + unusable_quantity >= 1)
);

create index collection_entries_commitment_idx on collection_entries (commitment_id);

-- Physical kit moves inside a group, each recorded once:
--   packed:     components -> kits ready for delivery (kit requests only)
--   unpacked:   ready kits -> components (to correct a packing mistake)
--   repaired:   kits not accepted -> ready for delivery again
--   set_aside:  kits not accepted -> removed from the drive
create table kit_movements (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments (id),
  kind text not null check (kind in ('packed', 'unpacked', 'repaired', 'set_aside')),
  quantity integer not null check (quantity >= 1),
  note text not null default '' check (char_length(note) <= 300),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create index kit_movements_commitment_idx on kit_movements (commitment_id);

-- A handover reported by a group. The receiving organization reviews it once.
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments (id),
  quantity integer not null check (quantity >= 1),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'submitted' check (status in ('submitted', 'cancelled', 'reviewed')),
  submitted_by uuid not null references profiles (id),
  submitted_at timestamptz not null default now(),
  cancelled_by uuid references profiles (id),
  cancelled_at timestamptz,
  accepted_quantity integer,
  not_accepted_quantity integer,
  review_note text not null default '' check (char_length(review_note) <= 1000),
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  -- A review accounts for every unit in the delivery, exactly once.
  check (
    (status = 'reviewed'
      and accepted_quantity >= 0 and not_accepted_quantity >= 0
      and accepted_quantity + not_accepted_quantity = quantity
      and reviewed_at is not null and reviewed_by is not null
      and (not_accepted_quantity = 0 or char_length(review_note) > 0))
    or
    (status <> 'reviewed'
      and accepted_quantity is null and not_accepted_quantity is null and reviewed_at is null)
  ),
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create index deliveries_commitment_idx on deliveries (commitment_id);

-- History --------------------------------------------------------------------

create table activity (
  id bigint generated always as identity primary key,
  request_id uuid references requests (id),
  commitment_id uuid references commitments (id),
  workspace_id uuid references workspaces (id),
  actor_id uuid references profiles (id),
  kind text not null,
  -- Who may read the event: the request's organization, the drive's group, or both.
  audience text not null check (audience in ('org', 'group', 'both')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_request_idx on activity (request_id, id desc);
create index activity_commitment_idx on activity (commitment_id, id desc);

-- Retried form submissions return the stored result instead of acting twice.
create table idempotency_keys (
  key uuid primary key,
  user_id uuid not null,
  action text not null,
  result jsonb,
  created_at timestamptz not null default now()
);

-- Direct database access ------------------------------------------------------
-- The browser never talks to these tables. Row-level security is enabled with
-- no policies, so the Supabase API roles (anon, authenticated) see nothing even
-- if this schema were exposed. The KitGap server connects as the owner role.
alter table profiles enable row level security;
alter table platform_admins enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table requests enable row level security;
alter table request_components enable row level security;
alter table commitments enable row level security;
alter table pledges enable row level security;
alter table collection_entries enable row level security;
alter table kit_movements enable row level security;
alter table deliveries enable row level security;
alter table activity enable row level security;
alter table idempotency_keys enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute format('revoke all on all tables in schema %I from anon, authenticated', current_schema());
    execute format('revoke all on schema %I from anon, authenticated', current_schema());
  end if;
end
$$;
