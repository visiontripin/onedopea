-- Run in the Supabase SQL editor. Create an Auth user and add its UUID to admin_users.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('audio','video','svg','project')),
  caption text not null default '', tags text[] not null default '{}',
  media_url text, soundcloud_url text, svg_markup text,
  is_published boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists posts_published_created_idx on public.posts (is_published, created_at desc);
alter table public.admin_users enable row level security;
alter table public.posts enable row level security;
create or replace function public.is_portfolio_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid()) $$;
drop policy if exists "Admins can read own admin mapping" on public.admin_users;
create policy "Admins can read own admin mapping" on public.admin_users for select using (user_id = auth.uid());
drop policy if exists "Published posts are public" on public.posts;
create policy "Published posts are public" on public.posts for select using (is_published = true or public.is_portfolio_admin());
drop policy if exists "Admins manage posts" on public.posts;
create policy "Admins manage posts" on public.posts for all using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-media','portfolio-media',true,52428800,array['audio/mpeg','audio/mp3','audio/wav','audio/ogg','video/mp4','video/webm']) on conflict (id) do nothing;
drop policy if exists "Public reads published media" on storage.objects;
create policy "Public reads published media" on storage.objects for select using (bucket_id = 'portfolio-media');
drop policy if exists "Admins upload portfolio media" on storage.objects;
create policy "Admins upload portfolio media" on storage.objects for insert with check (bucket_id = 'portfolio-media' and public.is_portfolio_admin());
drop policy if exists "Admins update portfolio media" on storage.objects;
create policy "Admins update portfolio media" on storage.objects for update using (bucket_id = 'portfolio-media' and public.is_portfolio_admin()) with check (bucket_id = 'portfolio-media' and public.is_portfolio_admin());
drop policy if exists "Admins delete portfolio media" on storage.objects;
create policy "Admins delete portfolio media" on storage.objects for delete using (bucket_id = 'portfolio-media' and public.is_portfolio_admin());
