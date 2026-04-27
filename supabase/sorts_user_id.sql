alter table public.sorts add column if not exists user_id uuid references auth.users(id) on delete cascade;
