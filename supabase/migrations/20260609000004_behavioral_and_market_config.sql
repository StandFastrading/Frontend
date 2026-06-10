-- Capture two onboarding data sets that were previously collected in the UI
-- but never persisted:
--   1. behavioral_baseline (profiles) — qualitative trader profile from the
--      onboarding "Behavioral check-in": mindset, risk tolerance, emotional
--      triggers, custom triggers. Nested/evolving shape → JSONB.
--   2. market_config (risk_rules) — per-market risk fields that have no
--      structured column (e.g. futures max-same-direction, weekly drawdown,
--      instrument unit, raw rule-toggle ids). Core numeric risk values
--      (account size, risk %, daily loss, max positions, etc.) continue to use
--      the existing risk_rules columns the Trade Desk + validation engine read.
--
-- Both are additive, NOT NULL with a '{}' default, so existing rows and the
-- working trade flow are unaffected. No backfill.

alter table public.profiles
  add column behavioral_baseline jsonb not null default '{}'::jsonb;

alter table public.risk_rules
  add column market_config jsonb not null default '{}'::jsonb;
