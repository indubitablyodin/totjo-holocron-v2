create table if not exists public.user_practice_history (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text,
  practice_kind text not null,
  completed_at timestamptz not null default timezone('utc', now()),
  duration_seconds integer not null default 0
);

alter table public.user_settings
  add column if not exists timer_preferences jsonb not null default '{}'::jsonb;

alter table public.user_practice_history enable row level security;

create policy "user_practice_history owner access"
on public.user_practice_history
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
