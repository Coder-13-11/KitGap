-- Community focus: two more kinds of need (senior homes and animal shelters),
-- and a simple count of how many times a need's public page was seen, so an
-- organization can see how far sharing it reached.

alter table requests drop constraint requests_category_check;
alter table requests add constraint requests_category_check
  check (category in ('school_supplies', 'hygiene', 'winter', 'baby', 'food', 'seniors', 'pets', 'other'));

-- One row per page per day. No visitor information of any kind is stored:
-- not who, not where from, not which device. Only a number.
create table page_views (
  subject_type text not null check (subject_type in ('request', 'drive')),
  subject_id uuid not null,
  day date not null,
  views integer not null default 0 check (views >= 0),
  primary key (subject_type, subject_id, day)
);

alter table page_views enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute format('revoke all on all tables in schema %I from anon, authenticated', current_schema());
  end if;
end
$$;
