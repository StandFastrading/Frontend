-- Beta access (Path A): invite-only entry via email + shared phase code.
-- Testers never create passwords or confirm email. Each approved tester maps
-- to exactly one hidden auth.users row (created by the FastAPI backend on first
-- entry); all downstream data keys off that user_id, so a tester's activity
-- stays connected across days. Validation + auth-user creation + session
-- minting all happen in the backend (service-role only). No anon-callable path.

create extension if not exists citext;

create type beta_phase as enum ('phase_1', 'phase_2');

-- Tag beta users on the existing profiles row (populated from auth
-- user_metadata via handle_new_user below). Existing users keep null values.
alter table public.profiles
  add column beta_phase beta_phase,
  add column signup_date timestamptz,
  add column access_code_used text;

-- Canonical phase -> access code mapping (one code per phase).
create table public.beta_access_codes (
  beta_phase beta_phase primary key,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.beta_access_codes (beta_phase, code, is_active) values
  ('phase_1', 'betaphase1', true),
  ('phase_2', 'betaphase2', true);

-- Approved beta testers (the gate). You preload rows here; user_id is filled in
-- by the backend on a tester's first successful entry and is then permanent.
create table public.beta_testers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  beta_phase beta_phase not null,
  is_active boolean not null default true,
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index idx_beta_testers_user on public.beta_testers (user_id);

-- RLS on, no policies: unreadable by anon/authenticated. The backend connects
-- as the Postgres role (bypasses RLS); no browser client ever touches these.
alter table public.beta_access_codes enable row level security;
alter table public.beta_testers enable row level security;

-- handle_new_user: superseded to also persist beta tags from auth user_metadata.
-- The trigger (on_auth_user_created) is unchanged — it points at this function.
create or replace function handle_new_user() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, display_name, beta_phase, signup_date, access_code_used
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'beta_phase', '')::beta_phase,
    new.created_at,
    nullif(new.raw_user_meta_data->>'access_code_used', '')
  )
  on conflict (id) do nothing;

  insert into public.risk_rules (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
