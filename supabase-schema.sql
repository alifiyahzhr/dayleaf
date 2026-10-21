-- dayleaf: one row per signed-in user, holding the latest synced copy of your data.
-- If `salt`+`vault` are set, the payload is AES-GCM encrypted client-side with your sync
-- passphrase (true end-to-end: Supabase only ever stores ciphertext). If you skip encryption,
-- `plain` holds the data as JSON instead.
create table if not exists public.vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text,
  vault text,
  plain text,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

create policy "Users manage their own vault"
  on public.vaults
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
