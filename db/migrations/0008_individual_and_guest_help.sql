-- Individual giving reuses the existing commitment ledger, with a private workspace.
alter table workspaces alter column invite_token drop not null;
alter table workspaces add column personal_owner_id uuid unique references profiles(id);
alter table workspaces add constraint personal_workspace_private check
  (personal_owner_id is null or (kind = 'group' and invite_token is null));
alter table commitments add column guest_pledges_enabled boolean not null default false;
alter table pledges add column guest_self_service boolean not null default false;
alter table pledges drop constraint pledges_guest_imported;
alter table pledges add constraint pledges_guest_source check
  (guest_name is null or import_source is not null or guest_self_service);
create table guest_pledge_access (
  token_hash text primary key,
  pledge_id uuid not null unique references pledges(id) on delete cascade,
  commitment_id uuid not null references commitments(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index guest_pledge_rate_idx on guest_pledge_access(commitment_id, created_at);
alter table guest_pledge_access enable row level security;
