-- Tabel memori per pengguna anonim (owner_id = cookie aigweh_uid).
-- Akses hanya lewat service_role di server. RLS aktif tanpa policy,
-- sehingga anon key dan authenticated key tidak bisa membaca atau menulis.

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  content text not null check (char_length(content) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists memories_owner_created_idx
  on public.memories (owner_id, created_at);

alter table public.memories enable row level security;
