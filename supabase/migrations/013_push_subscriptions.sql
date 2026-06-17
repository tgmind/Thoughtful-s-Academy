-- ============================================================================
-- 013_push_subscriptions.sql
-- Stores Web Push subscriptions so the send-push Edge Function can deliver
-- browser/PWA notifications to users who are not currently on the site.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Each user manages only their own subscriptions. The Edge Function reads all
-- of them via the service-role key, which bypasses RLS.
drop policy if exists "push: select own" on public.push_subscriptions;
create policy "push: select own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push: insert own" on public.push_subscriptions;
create policy "push: insert own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push: update own" on public.push_subscriptions;
create policy "push: update own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push: delete own" on public.push_subscriptions;
create policy "push: delete own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
