-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Adds the users table + inserts your first admin account
-- ============================================================

-- 1. Create users table
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  user_id     text unique not null,
  name        text not null,
  password    text not null,
  role        text not null default 'clerk',
  access      text[] not null default array['dashboard'],
  created_at  timestamptz default now()
);

-- 2. Enable RLS
alter table users enable row level security;
create policy "allow_all_users" on users for all using (true) with check (true);

-- 3. Insert default admin account
-- ✏️  Change the password here before running!
insert into users (user_id, name, password, role, access)
values (
  'admin',
  'Administrator',
  'admin123',
  'admin',
  array['dashboard','students','fees','expenses','petty','staff','analytics','admin']
)
on conflict (user_id) do nothing;

-- 4. Also add the num column to students and staff if missing
alter table students add column if not exists num integer default 0;
alter table staff    add column if not exists num integer default 0;
