-- How much of the paid AI service (Kit's answers and voice) each person or
-- demo used each day, so daily caps hold across server instances. Only the
-- live schema's copy is used; sandboxes get an unused copy like every table.
-- No personal data: the caller is "user:<id>" or "demo:<sandbox id>".

create table ai_usage (
  caller text not null check (char_length(caller) <= 80),
  day date not null,
  kind text not null check (kind in ('ai', 'voice')),
  count integer not null default 0 check (count >= 0),
  primary key (caller, day, kind)
);

alter table ai_usage enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute format('revoke all on all tables in schema %I from anon, authenticated', current_schema());
  end if;
end
$$;
