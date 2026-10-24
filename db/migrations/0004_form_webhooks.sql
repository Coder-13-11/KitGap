-- Live Google Forms sync (Tier 2). One optional webhook per drive. We store
-- only a hash of the secret; the raw URL is shown once, when it's created or
-- rotated. Hits are kept so a drive can be rate-limited.

alter table import_batches drop constraint import_batches_source_check;
alter table import_batches add constraint import_batches_source_check
  check (source in ('google_forms_csv', 'signupgenius_csv', 'spreadsheet', 'google_forms_webhook'));

alter table pledges drop constraint pledges_import_source_check;
alter table pledges add constraint pledges_import_source_check
  check (import_source in ('google_forms_csv', 'signupgenius_csv', 'spreadsheet', 'google_forms_webhook'));

create table form_webhooks (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null unique references commitments (id),
  secret_hash text not null,
  -- Question titles on the form, and how answers map to this drive's items.
  questions jsonb not null default '{}'::jsonb,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  disabled_at timestamptz,
  last_used_at timestamptz
);

create index form_webhooks_hash_idx on form_webhooks (secret_hash) where disabled_at is null;

create table form_webhook_hits (
  id bigint generated always as identity primary key,
  webhook_id uuid not null references form_webhooks (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index form_webhook_hits_recent_idx on form_webhook_hits (webhook_id, created_at desc);

alter table form_webhooks enable row level security;
alter table form_webhook_hits enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute format('revoke all on all tables in schema %I from anon, authenticated', current_schema());
  end if;
end
$$;
