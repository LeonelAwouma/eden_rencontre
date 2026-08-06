-- ============================================================
--  Eden Connexion — Password Reset OTP System (Supabase)
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── PASSWORD RESET OTPs ─────────────────────────────────────
create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used boolean not null default false,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookups by user and validity
create index if not exists idx_password_reset_otps_user_active
  on public.password_reset_otps (user_id, used, expires_at desc);

-- Index for cleanup of expired OTPs
create index if not exists idx_password_reset_otps_expires
  on public.password_reset_otps (expires_at)
  where used = false;

-- Enable RLS (service role bypasses RLS, so only server-side code accesses this table)
alter table public.password_reset_otps enable row level security;

-- No direct client policies — all access is via server-side service role
-- This table should never be accessed directly from the client

-- ── Auto-update updated_at trigger ──────────────────────────
create or replace function public.update_password_reset_otps_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_password_reset_otps_update on public.password_reset_otps;
create trigger on_password_reset_otps_update
  before update on public.password_reset_otps
  for each row execute function public.update_password_reset_otps_updated_at();

-- ── Cleanup function for expired OTPs ───────────────────────
-- Can be called periodically (e.g., via pg_cron or manually)
create or replace function public.cleanup_expired_otps()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.password_reset_otps
  where expires_at < now() - interval '1 hour';
end;
$$;

-- ── Rate limiting tracking table ────────────────────────────
create table if not exists public.password_reset_rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null, -- IP address or email hash
  action text not null,     -- 'forgot_password', 'verify_otp', 'resend_otp'
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_identifier_action
  on public.password_reset_rate_limits (identifier, action, created_at desc);

alter table public.password_reset_rate_limits enable row level security;

-- Cleanup old rate limit records (older than 2 hours)
create or replace function public.cleanup_old_rate_limits()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.password_reset_rate_limits
  where created_at < now() - interval '2 hours';
end;
$$;