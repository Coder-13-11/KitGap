-- When each person last opened their Updates page, for the unread count.
alter table profiles add column updates_seen_at timestamptz;
