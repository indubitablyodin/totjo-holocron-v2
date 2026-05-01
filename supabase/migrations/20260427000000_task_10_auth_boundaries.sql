create table if not exists public.user_progress (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null,
  progress_percent numeric(5, 2) not null,
  last_anchor text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reading_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_bookmarks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null,
  anchor text not null,
  label text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, document_id, anchor)
);

create table if not exists public.user_notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null,
  anchor text,
  body_markdown text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_downloads (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null,
  status text not null,
  stored_checksum text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_personalization_rules (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null,
  document_id text,
  token text not null,
  replacement text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_progress enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_bookmarks enable row level security;
alter table public.user_notes enable row level security;
alter table public.user_downloads enable row level security;
alter table public.user_personalization_rules enable row level security;

create policy "user_progress owner access" on public.user_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings owner access" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_bookmarks owner access" on public.user_bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_notes owner access" on public.user_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_downloads owner access" on public.user_downloads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_personalization_rules owner access" on public.user_personalization_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
