-- Standfast Web: initial schema
-- Persists everything that currently lives in zustand + localStorage.
-- See: plans/modular-swinging-riddle.md (Phase 1)

-- =============================================================================
-- Bootstrap
-- =============================================================================

create extension if not exists "pgcrypto";

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- Singletons: profiles, risk_rules
-- =============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  plan text not null default 'trial'
    check (plan in ('trial','starter','pro','elite')),
  onboarding_complete boolean not null default false,
  onboarding_step int not null default 0,
  onboarding_completed_at timestamptz,
  selected_markets text[] not null default '{}'
    check (selected_markets <@ array['Stocks','Options','Futures','Forex','Crypto']),
  migrated_from_local_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create table risk_rules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_size numeric not null default 0,
  account_currency text not null default 'USD'
    check (account_currency in ('USD','EUR','GBP','CAD')),
  account_type text not null default 'Cash'
    check (account_type in ('Cash','Margin','Futures','Crypto')),
  base_risk_per_trade_percent numeric not null default 1,
  max_dollar_risk_per_trade numeric not null default 0,
  max_daily_loss_percent numeric not null default 3,
  max_daily_trades int not null default 5,
  max_red_trades int not null default 2,
  max_consecutive_losses int not null default 2,
  cooldown_after_loss_minutes int not null default 30,
  require_stop_loss boolean not null default true,
  minimum_reward_risk numeric not null default 2,
  max_position_size numeric not null default 0,
  max_adds_per_trade int not null default 1,
  max_open_positions int not null default 1,
  no_averaging_down boolean not null default true,
  setup_must_be_approved boolean not null default true,
  allowed_setups text[] not null default '{}',
  no_reentry_within_minutes int not null default 0,
  no_revenge_trading boolean not null default true,
  no_trading_after_emotional_warning boolean not null default true,
  no_trades_outside_allowed_setups boolean not null default true,
  no_overtrading boolean not null default true,
  warning_level text not null default 'standard'
    check (warning_level in ('soft','standard','strict','hard_lock')),
  require_confirmation_before_override boolean not null default true,
  reflection_prompt_after_override boolean not null default true,
  lockout_after_max_loss boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger trg_risk_rules_updated_at before update on risk_rules
  for each row execute function set_updated_at();

-- =============================================================================
-- trading_sessions
-- =============================================================================

create table trading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  trading_date date not null,
  session_type text not null default 'regular'
    check (session_type in ('premarket','regular','afterhours','custom')),
  custom_label text,
  status text not null default 'active' check (status in ('active','closed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  closed_daily_loss_used_percent numeric,
  closed_trades_taken int,
  closed_red_trades int,
  closed_consecutive_losses int,
  closed_daily_loss_breached boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create unique index uniq_active_session_per_user
  on trading_sessions (user_id) where status = 'active';
create index idx_sessions_user_date on trading_sessions (user_id, trading_date desc);
create trigger trg_sessions_updated_at before update on trading_sessions
  for each row execute function set_updated_at();

-- =============================================================================
-- trades (merged active + closed)
-- =============================================================================

create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  -- Cross-entity FKs are stored as the related row's client_id (text), not its
  -- server UUID. Lets the client populate them at write time without first
  -- resolving the server UUID. Referential integrity is enforced at the
  -- application layer + by RLS (rows are user-scoped).
  session_id text,
  trading_date date not null,
  symbol text not null,
  market_type text not null
    check (market_type in ('Stocks','Options','Futures','Forex','Crypto')),
  direction text not null check (direction in ('Long','Short')),
  setup_type text not null default '',
  -- baseline (frozen at approval)
  entry_price numeric not null,
  stop_price numeric,
  target_price numeric,
  position_size numeric not null,
  trade_plan text not null default '',
  approved_at timestamptz not null,
  activated_at timestamptz not null,
  original_risk numeric,
  account_risk_percent numeric,
  reward_risk_ratio numeric,
  -- current (mutable)
  current_stop_price numeric,
  current_target_price numeric,
  current_position_size numeric not null,
  current_avg_entry numeric not null,
  current_risk numeric,
  current_account_risk_percent numeric,
  current_reward_risk_ratio numeric,
  mistake_flagged boolean not null default false,
  mistake_note text,
  -- exit (null until closed)
  closed_at timestamptz,
  exit_price numeric,
  exit_outcome text check (exit_outcome in ('win','loss','breakeven')),
  realized_pnl numeric,
  realized_r numeric,
  exit_reflection text,
  exit_reason text check (exit_reason in (
    'target_hit','stop_loss_hit','manual_exit_risk_reduction',
    'manual_exit_profit_protection','manual_exit_thesis_failed',
    'manual_exit_emotional','end_of_day_exit','other'
  )),
  exit_notes text,
  loss_reduced boolean,
  loss_reduction_amount numeric,
  loss_reduction_percent numeric,
  -- approval metadata
  approval_status text not null default 'approved'
    check (approval_status in ('approved','approved_with_warnings')),
  approval_warnings jsonb not null default '[]',
  override_accepted boolean not null default false,
  status text not null default 'active' check (status in ('active','closed')),
  source text not null default 'manual_confirmation',
  -- close-time tallies
  deviation_count int not null default 0,
  mistake_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id),
  constraint closed_has_exit check (
    status = 'active' or (closed_at is not null and exit_price is not null)
  )
);
create index idx_trades_user_status on trades (user_id, status);
create index idx_trades_user_session on trades (user_id, session_id);
create index idx_trades_user_closed on trades (user_id, closed_at desc) where status = 'closed';
create trigger trg_trades_updated_at before update on trades
  for each row execute function set_updated_at();

-- =============================================================================
-- trade_monitoring_events (append-only per-trade actions)
-- =============================================================================

create table trade_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  trade_id text not null,
  session_id text,
  trading_date date,
  "timestamp" timestamptz not null,
  "update" jsonb not null,
  deviations jsonb not null default '[]',
  severity text not null check (severity in ('info','caution','elevated','critical')),
  recommendations jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index idx_tme_trade_time on trade_monitoring_events (trade_id, "timestamp");
create index idx_tme_user_session on trade_monitoring_events (user_id, session_id, "timestamp");

-- =============================================================================
-- behavior_events (append-only log)
-- =============================================================================

create table behavior_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  session_id text,
  trade_id text,
  trading_date date,
  event_type text not null,
  display_title text not null,
  display_description text not null default '',
  source text not null
    check (source in ('trade_desk','rules_risk','journal','system')),
  symbol text,
  setup_type text,
  direction text check (direction in ('Long','Short')),
  decision text check (decision in
    ('approved','cancel_trade','revise_trade','continue_anyway')),
  severity text not null check (severity in ('info','warning','fail')),
  triggered_rules jsonb not null default '[]',
  total_risk numeric,
  account_risk_percent numeric,
  metadata jsonb not null default '{}',
  "timestamp" timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index idx_be_user_time on behavior_events (user_id, "timestamp" desc);
create index idx_be_session on behavior_events (user_id, session_id, "timestamp");
create index idx_be_trade on behavior_events (user_id, trade_id);

-- =============================================================================
-- interventions (append-only decision-refinement log)
-- =============================================================================

create table interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  session_id text,
  behavior_event_id text,
  trading_date date,
  "timestamp" timestamptz not null,
  decision text not null check (decision in
    ('continue_anyway','revise_trade','cancel_trade')),
  event_type text not null check (event_type in (
    'intervention_cancel_trade','intervention_revise_trade','intervention_continue_anyway'
  )),
  severity text not null check (severity in ('warning','violation')),
  symbol text,
  market_type text,
  direction text,
  setup_type text,
  entry_price numeric,
  stop_price numeric,
  target_price numeric,
  position_size numeric,
  account_size numeric,
  total_risk numeric,
  account_risk_percent numeric,
  reward_risk_ratio numeric,
  validation_status text check (validation_status in ('approved','warning','violation')),
  triggered_rules jsonb not null default '[]',
  warning_count int,
  violation_count int,
  source text not null default 'trade_desk_intervention',
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index idx_int_user_time on interventions (user_id, "timestamp" desc);
create index idx_int_session on interventions (user_id, session_id);

-- =============================================================================
-- session_notes (append-only)
-- =============================================================================

create table session_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  session_id text,
  trading_date date,
  content text not null,
  category text not null default 'general'
    check (category in ('general','behavior','strategy','mindset')),
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index idx_sn_user_session on session_notes (user_id, session_id, created_at);

-- =============================================================================
-- daily_reflections (one per user/trading_date)
-- =============================================================================

create table daily_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text,
  trading_date date not null,
  answers jsonb not null default '{}',
  emotional_notes text not null default '',
  freeform_notes text not null default '',
  summary jsonb not null default '{}',
  insight text not null default '',
  tomorrow_focus text not null default '',
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, trading_date)
);
create trigger trg_dr_updated_at before update on daily_reflections
  for each row execute function set_updated_at();

-- =============================================================================
-- trade_reflections (one per user/trade)
-- =============================================================================

create table trade_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id text not null,
  trading_date date,
  answers jsonb not null default '{}',
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, trade_id)
);
create trigger trg_tr_updated_at before update on trade_reflections
  for each row execute function set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table profiles enable row level security;
alter table risk_rules enable row level security;
alter table trading_sessions enable row level security;
alter table trades enable row level security;
alter table trade_monitoring_events enable row level security;
alter table behavior_events enable row level security;
alter table interventions enable row level security;
alter table session_notes enable row level security;
alter table daily_reflections enable row level security;
alter table trade_reflections enable row level security;

-- profiles: keyed by id (not user_id)
create policy profiles_select on profiles
  for select using (id = auth.uid());
create policy profiles_insert on profiles
  for insert with check (id = auth.uid());
create policy profiles_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete on profiles
  for delete using (id = auth.uid());

-- risk_rules (singleton)
create policy risk_rules_select on risk_rules
  for select using (user_id = auth.uid());
create policy risk_rules_insert on risk_rules
  for insert with check (user_id = auth.uid());
create policy risk_rules_update on risk_rules
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy risk_rules_delete on risk_rules
  for delete using (user_id = auth.uid());

-- trading_sessions
create policy sessions_select on trading_sessions
  for select using (user_id = auth.uid());
create policy sessions_insert on trading_sessions
  for insert with check (user_id = auth.uid());
create policy sessions_update on trading_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sessions_delete on trading_sessions
  for delete using (user_id = auth.uid());

-- trades
create policy trades_select on trades
  for select using (user_id = auth.uid());
create policy trades_insert on trades
  for insert with check (user_id = auth.uid());
create policy trades_update on trades
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy trades_delete on trades
  for delete using (user_id = auth.uid());

-- daily_reflections (mutable, full 4-policy)
create policy daily_reflections_select on daily_reflections
  for select using (user_id = auth.uid());
create policy daily_reflections_insert on daily_reflections
  for insert with check (user_id = auth.uid());
create policy daily_reflections_update on daily_reflections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy daily_reflections_delete on daily_reflections
  for delete using (user_id = auth.uid());

-- trade_reflections (mutable, full 4-policy)
create policy trade_reflections_select on trade_reflections
  for select using (user_id = auth.uid());
create policy trade_reflections_insert on trade_reflections
  for insert with check (user_id = auth.uid());
create policy trade_reflections_update on trade_reflections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy trade_reflections_delete on trade_reflections
  for delete using (user_id = auth.uid());

-- Append-only logs: SELECT + INSERT only. No UPDATE, no DELETE — historical events are immutable.
create policy behavior_events_select on behavior_events
  for select using (user_id = auth.uid());
create policy behavior_events_insert on behavior_events
  for insert with check (user_id = auth.uid());

create policy interventions_select on interventions
  for select using (user_id = auth.uid());
create policy interventions_insert on interventions
  for insert with check (user_id = auth.uid());

create policy tme_select on trade_monitoring_events
  for select using (user_id = auth.uid());
create policy tme_insert on trade_monitoring_events
  for insert with check (user_id = auth.uid());

create policy session_notes_select on session_notes
  for select using (user_id = auth.uid());
create policy session_notes_insert on session_notes
  for insert with check (user_id = auth.uid());
