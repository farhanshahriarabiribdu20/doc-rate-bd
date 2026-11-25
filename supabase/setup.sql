-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- One table holds every small JSON document of the site (rates, settings, listings, feedback, history ...).
create table if not exists public.docs (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists docs_key_prefix on public.docs (key text_pattern_ops);
create index if not exists docs_updated on public.docs (updated_at desc);

-- Closed to the public: no policies, so only the server (service_role key) can read or write.
alter table public.docs enable row level security;

-- Newer Supabase projects do not give the server role access to tables made in the SQL editor automatically.
grant usage on schema public to service_role;
grant all on public.docs to service_role;
