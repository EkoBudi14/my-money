-- Optional features from catatduit-design (DESIGN.md 0.5, DESIGN-TAMBAHAN §10).
-- Run once in the Supabase SQL editor. The app detects these columns and keeps
-- the features hidden until they exist, so running this is safe at any time.

-- "Tandai selesai dan arsipkan" on Goals
alter table public.goals
  add column if not exists archived_at timestamptz;

-- "Ulangi tiap periode" on Budget: a recurring budget is copied into the
-- next period automatically when that period is opened on the Budget page.
alter table public.budgets
  add column if not exists is_recurring boolean not null default false;
