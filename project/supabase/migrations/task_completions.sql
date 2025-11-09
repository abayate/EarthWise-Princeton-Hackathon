-- Task completions table
-- Tracks when users complete tasks and the points they earned

create table if not exists public.task_completions (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  task_id text not null,
  points integer not null default 0,
  created_at timestamp with time zone null default now(),
  constraint task_completions_pkey primary key (id)
) tablespace pg_default;

-- Enable Row Level Security (RLS)
alter table public.task_completions enable row level security;

-- Allow authenticated users to SELECT their own task completions
create policy "Select own task completions"
  on public.task_completions
  for select
  using (auth.uid()::text = user_id);

-- Allow authenticated users to INSERT their own task completions
create policy "Insert own task completions"
  on public.task_completions
  for insert
  with check (auth.uid()::text = user_id);

-- Allow authenticated users to UPDATE their own task completions
create policy "Update own task completions"
  on public.task_completions
  for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Allow authenticated users to DELETE their own task completions
create policy "Delete own task completions"
  on public.task_completions
  for delete
  using (auth.uid()::text = user_id);

-- Create an index on user_id for faster queries
create index if not exists idx_task_completions_user_id on public.task_completions(user_id);

-- Create an index on created_at for time-based queries
create index if not exists idx_task_completions_created_at on public.task_completions(created_at);
