create table if not exists public.community_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(30) not null unique
    check (username = lower(username) and username ~ '^[a-z0-9._-]{3,30}$'),
  display_name varchar(48) not null check (length(trim(display_name)) >= 2),
  bio varchar(240),
  avatar_url text,
  role varchar(16) not null default 'user'
    check (role in ('user', 'moderator', 'admin', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_telegram_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_id text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.create_community_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_username text;
  profile_name text;
begin
  profile_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  ));
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    profile_username
  );

  insert into public.community_profiles (id, username, display_name)
  values (new.id, profile_username, profile_name);

  if nullif(new.raw_user_meta_data ->> 'telegram_id', '') is not null then
    insert into public.community_telegram_links (user_id, telegram_id)
    values (new.id, new.raw_user_meta_data ->> 'telegram_id');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_community on auth.users;
create trigger on_auth_user_created_community
after insert on auth.users
for each row execute function public.create_community_profile();

create or replace function public.has_community_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select case role
      when 'user' then 0
      when 'moderator' then 1
      when 'admin' then 2
      when 'owner' then 3
      else -1
    end >= case required_role
      when 'user' then 0
      when 'moderator' then 1
      when 'admin' then 2
      when 'owner' then 3
      else 4
    end
    from public.community_profiles
    where id = auth.uid()
  ), false);
$$;

revoke all on function public.has_community_role(text) from public;
grant execute on function public.has_community_role(text) to anon, authenticated;

create or replace function public.moderate_community_post(
  target_post_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_community_role('moderator') then
    raise exception 'moderator access required';
  end if;
  if next_status not in ('approved', 'rejected') then
    raise exception 'invalid post status';
  end if;

  update public.community_posts
  set moderation_status = next_status
  where id = target_post_id and moderation_status = 'pending';
  if not found then
    raise exception 'pending post not found';
  end if;
end;
$$;

create or replace function public.moderate_marketplace_listing(
  target_listing_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_community_role('moderator') then
    raise exception 'moderator access required';
  end if;
  if next_status not in ('active', 'rejected') then
    raise exception 'invalid listing status';
  end if;

  update public.marketplace_listings
  set status = next_status, updated_at = now()
  where id = target_listing_id and status = 'pending';
  if not found then
    raise exception 'pending listing not found';
  end if;
end;
$$;

create or replace function public.set_community_role(
  target_user_id uuid,
  next_role text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_role text;
  actor_role text;
begin
  if not public.has_community_role('admin') then
    raise exception 'admin access required';
  end if;
  if next_role not in ('user', 'moderator', 'admin', 'owner') then
    raise exception 'invalid community role';
  end if;

  select role into actor_role
  from public.community_profiles
  where id = auth.uid();

  select role into current_role
  from public.community_profiles
  where id = target_user_id
  for update;
  if not found then
    raise exception 'community profile not found';
  end if;

  if actor_role = 'admin' and (
    next_role not in ('user', 'moderator')
    or current_role not in ('user', 'moderator')
    or target_user_id = auth.uid()
  ) then
    raise exception 'admins can only manage other users and moderators';
  end if;

  if current_role = 'owner' and next_role <> 'owner'
    and (select count(*) from public.community_profiles where role = 'owner') <= 1 then
    raise exception 'cannot remove the last owner';
  end if;

  update public.community_profiles
  set role = next_role, updated_at = now()
  where id = target_user_id;
end;
$$;

create or replace function public.owner_delete_community_post(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_community_role('owner') then
    raise exception 'owner access required';
  end if;
  delete from public.community_posts where id = target_id;
  if not found then
    raise exception 'post not found';
  end if;
end;
$$;

create or replace function public.owner_delete_marketplace_listing(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_community_role('owner') then
    raise exception 'owner access required';
  end if;
  delete from public.marketplace_listings where id = target_id;
  if not found then
    raise exception 'listing not found';
  end if;
end;
$$;

create or replace function public.owner_delete_chat_message(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_community_role('owner') then
    raise exception 'owner access required';
  end if;
  delete from public.community_chat_messages where id = target_id;
  if not found then
    raise exception 'chat message not found';
  end if;
end;
$$;

create or replace function public.owner_delete_comment(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_community_role('owner') then
    raise exception 'owner access required';
  end if;
  delete from public.community_post_comments where id = target_id;
  if not found then
    raise exception 'comment not found';
  end if;
end;
$$;

revoke all on function public.moderate_community_post(uuid, text) from public;
revoke all on function public.moderate_marketplace_listing(uuid, text) from public;
revoke all on function public.set_community_role(uuid, text) from public;
revoke all on function public.owner_delete_community_post(uuid) from public;
revoke all on function public.owner_delete_marketplace_listing(uuid) from public;
revoke all on function public.owner_delete_chat_message(uuid) from public;
revoke all on function public.owner_delete_comment(uuid) from public;
grant execute on function public.moderate_community_post(uuid, text) to authenticated;
grant execute on function public.moderate_marketplace_listing(uuid, text) to authenticated;
grant execute on function public.set_community_role(uuid, text) to authenticated;
grant execute on function public.owner_delete_community_post(uuid) to authenticated;
grant execute on function public.owner_delete_marketplace_listing(uuid) to authenticated;
grant execute on function public.owner_delete_chat_message(uuid) to authenticated;
grant execute on function public.owner_delete_comment(uuid) to authenticated;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  author_label varchar(80),
  category varchar(24) not null default 'general'
    check (category in ('general', 'overheard', 'study', 'event', 'question')),
  content varchar(3000) not null check (length(trim(content)) >= 5),
  is_anonymous boolean not null default false,
  moderation_status varchar(16) not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'publishing')),
  source varchar(16) not null default 'site'
    check (source in ('site', 'telegram')),
  moderation_notified_at timestamptz,
  published_to_channel boolean not null default false,
  telegram_message_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_feed_idx
  on public.community_posts (moderation_status, created_at desc);
create index if not exists community_posts_moderation_idx
  on public.community_posts (moderation_status, moderation_notified_at);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content varchar(1000) not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists community_post_comments_post_idx
  on public.community_post_comments (post_id, created_at);

create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  reaction varchar(16) not null default 'heart',
  created_at timestamptz not null default now(),
  unique (post_id, author_id, reaction)
);

create table if not exists public.community_chat_rooms (
  key varchar(40) primary key,
  name varchar(64) not null,
  description varchar(160) not null,
  created_at timestamptz not null default now()
);

insert into public.community_chat_rooms (key, name, description) values
  ('general', 'Общий чат', 'Общение и вопросы о жизни университета'),
  ('study', 'Учёба', 'Учебные вопросы, конспекты и взаимопомощь'),
  ('it-club', 'IT Club', 'Технологии, проекты и программирование'),
  ('memes', 'Мемы', 'Студенческий юмор'),
  ('marketplace', 'Барахолка', 'Объявления о продаже и обмене')
on conflict (key) do nothing;

create table if not exists public.community_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_key varchar(40) not null references public.community_chat_rooms(key) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  message_type varchar(16) not null default 'message'
    check (message_type in ('message', 'listing')),
  content varchar(1000) not null default '',
  listing_title varchar(100),
  listing_price integer check (listing_price is null or listing_price >= 0),
  created_at timestamptz not null default now(),
  check (
    (message_type = 'listing' and listing_title is not null)
    or (message_type = 'message' and listing_title is null and listing_price is null)
  )
);

create index if not exists community_chat_messages_room_idx
  on public.community_chat_messages (room_key, created_at);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title varchar(100) not null check (length(trim(title)) >= 3),
  description varchar(1000) not null default '',
  price integer check (price is null or price >= 0),
  category varchar(32) not null default 'other',
  status varchar(16) not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'sold')),
  moderation_notified_at timestamptz,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_listings_feed_idx
  on public.marketplace_listings (status, created_at desc);

alter table public.community_profiles enable row level security;
alter table public.community_telegram_links enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_chat_rooms enable row level security;
alter table public.community_chat_messages enable row level security;
alter table public.marketplace_listings enable row level security;

drop policy if exists "Public profiles are readable" on public.community_profiles;
create policy "Public profiles are readable"
  on public.community_profiles for select to anon, authenticated using (true);
drop policy if exists "Users update own profile" on public.community_profiles;
create policy "Users update own profile"
  on public.community_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Approved posts and own posts are readable" on public.community_posts;
create policy "Approved posts and own posts are readable"
  on public.community_posts for select to anon, authenticated
  using (
    moderation_status = 'approved'
    or author_id = auth.uid()
    or public.has_community_role('moderator')
  );
drop policy if exists "Users submit posts for review" on public.community_posts;
create policy "Users submit posts for review"
  on public.community_posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and moderation_status = 'pending'
    and source = 'site'
    and published_to_channel = false
  );

drop policy if exists "Comments on visible posts are readable" on public.community_post_comments;
create policy "Comments on visible posts are readable"
  on public.community_post_comments for select to anon, authenticated
  using (exists (
    select 1 from public.community_posts p
    where p.id = post_id and (
      p.moderation_status = 'approved'
      or public.has_community_role('moderator')
    )
  ));
drop policy if exists "Users comment on approved posts" on public.community_post_comments;
create policy "Users comment on approved posts"
  on public.community_post_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.moderation_status = 'approved'
    )
  );

drop policy if exists "Reactions are readable" on public.community_post_reactions;
create policy "Reactions are readable"
  on public.community_post_reactions for select to anon, authenticated using (true);
drop policy if exists "Users react as themselves" on public.community_post_reactions;
create policy "Users react as themselves"
  on public.community_post_reactions for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.moderation_status = 'approved'
    )
  );
drop policy if exists "Users remove own reactions" on public.community_post_reactions;
create policy "Users remove own reactions"
  on public.community_post_reactions for delete to authenticated
  using (author_id = auth.uid());

drop policy if exists "Chat rooms are readable" on public.community_chat_rooms;
create policy "Chat rooms are readable"
  on public.community_chat_rooms for select to anon, authenticated using (true);
drop policy if exists "Signed-in users read chat" on public.community_chat_messages;
create policy "Signed-in users read chat"
  on public.community_chat_messages for select to authenticated using (true);
drop policy if exists "Users send chat messages as themselves" on public.community_chat_messages;
create policy "Users send chat messages as themselves"
  on public.community_chat_messages for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "Active listings and own listings are readable" on public.marketplace_listings;
create policy "Active listings and own listings are readable"
  on public.marketplace_listings for select to anon, authenticated
  using (
    status = 'active'
    or author_id = auth.uid()
    or public.has_community_role('moderator')
  );
drop policy if exists "Users submit listings for review" on public.marketplace_listings;
create policy "Users submit listings for review"
  on public.marketplace_listings for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending');

grant select on public.community_profiles to anon, authenticated;
revoke update on public.community_profiles from authenticated;
grant update (display_name, bio, avatar_url, updated_at)
  on public.community_profiles to authenticated;
grant select, insert on public.community_posts to authenticated;
grant select on public.community_posts to anon;
grant select, insert on public.community_post_comments to authenticated;
grant select on public.community_post_comments to anon;
grant select, insert, delete on public.community_post_reactions to authenticated;
grant select on public.community_post_reactions to anon;
grant select on public.community_chat_rooms to anon, authenticated;
grant select, insert on public.community_chat_messages to authenticated;
grant select, insert on public.marketplace_listings to authenticated;
grant select on public.marketplace_listings to anon;
grant all on public.community_profiles,
  public.community_telegram_links,
  public.community_posts,
  public.community_post_comments,
  public.community_post_reactions,
  public.community_chat_rooms,
  public.community_chat_messages,
  public.marketplace_listings
to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_chat_messages'
  ) then
    alter publication supabase_realtime add table public.community_chat_messages;
  end if;
end
$$;
