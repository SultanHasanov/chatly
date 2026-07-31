-- Chat Brat database schema
create extension if not exists pgcrypto;

create type public.conversation_kind as enum ('group', 'direct');
create type public.message_kind as enum ('text', 'image', 'video', 'document', 'voice');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  telegram_id bigint unique,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  name text check (kind = 'direct' or char_length(name) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  avatar_path text,
  created_by uuid not null references public.profiles(id),
  direct_key text unique,
  created_at timestamptz not null default now(),
  check ((kind = 'direct' and direct_key is not null) or (kind = 'group' and direct_key is null))
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  pinned boolean not null default false,
  notifications text not null default 'all' check (notifications in ('all', 'mentions', 'off')),
  primary key (conversation_id, user_id)
);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(18), 'hex'),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  kind public.message_kind not null default 'text',
  body text not null default '' check (char_length(body) <= 10000),
  reply_to_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null unique,
  thumbnail_path text,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  width integer,
  height integer,
  duration_ms integer,
  position smallint not null default 0
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index memberships_user_idx on public.conversation_members(user_id);

create function public.is_conversation_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversation_members where conversation_id = target and user_id = auth.uid());
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Гость'))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.create_group(group_name text, group_description text default null)
returns table(conversation_id uuid, invite_code text)
language plpgsql security definer set search_path = '' as $$
declare new_id uuid; new_code text;
begin
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, true) then raise exception 'telegram_required'; end if;
  insert into public.conversations(kind, name, description, created_by)
  values ('group', trim(group_name), nullif(trim(group_description), ''), auth.uid()) returning id into new_id;
  insert into public.conversation_members(conversation_id, user_id, role) values(new_id, auth.uid(), 'owner');
  insert into public.group_invites(conversation_id, created_by) values(new_id, auth.uid()) returning code into new_code;
  return query select new_id, new_code;
end;
$$;

create function public.preview_invite(invite_code text)
returns table(conversation_id uuid, name text, avatar_path text, member_count bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.avatar_path, count(cm.user_id)
  from public.group_invites i join public.conversations c on c.id=i.conversation_id
  left join public.conversation_members cm on cm.conversation_id=c.id
  where i.code=invite_code and i.active group by c.id;
$$;

create function public.join_group(invite_code text, guest_name text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  select conversation_id into target from public.group_invites where code=invite_code and active;
  if target is null then raise exception 'invalid_invite'; end if;
  if guest_name is not null then update public.profiles set display_name=trim(guest_name), updated_at=now() where id=auth.uid(); end if;
  insert into public.conversation_members(conversation_id,user_id) values(target,auth.uid()) on conflict do nothing;
  return target;
end;
$$;

create function public.open_direct(other_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare key text; target uuid;
begin
  if other_user=auth.uid() then raise exception 'invalid_recipient'; end if;
  if not exists(
    select 1 from public.conversation_members mine
    join public.conversation_members theirs on theirs.conversation_id=mine.conversation_id
    join public.conversations c on c.id=mine.conversation_id and c.kind='group'
    where mine.user_id=auth.uid() and theirs.user_id=other_user
  ) then raise exception 'no_shared_group'; end if;
  key := least(auth.uid()::text,other_user::text)||':'||greatest(auth.uid()::text,other_user::text);
  insert into public.conversations(kind,created_by,direct_key) values('direct',auth.uid(),key)
  on conflict(direct_key) do update set direct_key=excluded.direct_key returning id into target;
  insert into public.conversation_members(conversation_id,user_id) values(target,auth.uid()),(target,other_user) on conflict do nothing;
  return target;
end;
$$;

create function public.reset_invite(target uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare next_code text := encode(gen_random_bytes(18),'hex');
begin
  if not exists(select 1 from public.conversations where id=target and created_by=auth.uid()) then raise exception 'forbidden'; end if;
  update public.group_invites set code=next_code, active=true, created_at=now(), created_by=auth.uid() where conversation_id=target;
  return next_code;
end;
$$;

create function public.rename_group(target uuid, new_name text, new_description text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.conversations where id=target and kind='group' and created_by=auth.uid()) then raise exception 'forbidden'; end if;
  if char_length(trim(new_name)) < 1 or char_length(trim(new_name)) > 100 then raise exception 'invalid_name'; end if;
  update public.conversations set name=trim(new_name),description=nullif(trim(new_description),'') where id=target;
end;
$$;

create function public.delete_group(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.conversations where id=target and kind='group' and created_by=auth.uid()) then raise exception 'forbidden'; end if;
  delete from public.conversations where id=target;
end;
$$;

create function public.merge_guest_account(source_user uuid, target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if source_user=target_user then return; end if;
  insert into public.conversation_members(conversation_id,user_id,role,joined_at,last_read_at,pinned,notifications)
  select conversation_id,target_user,role,joined_at,last_read_at,pinned,notifications from public.conversation_members where user_id=source_user
  on conflict(conversation_id,user_id) do update set
    pinned=public.conversation_members.pinned or excluded.pinned,
    last_read_at=greatest(public.conversation_members.last_read_at,excluded.last_read_at);
  update public.messages set author_id=target_user where author_id=source_user;
  update public.conversations set created_by=target_user where created_by=source_user;
  update public.push_subscriptions set user_id=target_user where user_id=source_user and endpoint not in(select endpoint from public.push_subscriptions where user_id=target_user);
  delete from public.push_subscriptions where user_id=source_user;
  update public.profiles target set avatar_path=coalesce(target.avatar_path,source.avatar_path),updated_at=now() from public.profiles source where target.id=target_user and source.id=source_user;
  delete from public.conversation_members where user_id=source_user;
end;
$$;
revoke all on function public.merge_guest_account(uuid,uuid) from public, anon, authenticated;
grant execute on function public.merge_guest_account(uuid,uuid) to service_role;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.push_subscriptions enable row level security;

create policy profiles_shared_select on public.profiles for select to authenticated using (
  id=auth.uid() or exists(select 1 from public.conversation_members a join public.conversation_members b using(conversation_id) where a.user_id=auth.uid() and b.user_id=profiles.id)
);
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy conversations_member_select on public.conversations for select to authenticated using(public.is_conversation_member(id));
create policy conversations_owner_update on public.conversations for update to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
create policy members_shared_select on public.conversation_members for select to authenticated using(public.is_conversation_member(conversation_id));
create policy members_self_update on public.conversation_members for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy members_self_delete on public.conversation_members for delete to authenticated using(user_id=auth.uid());
create policy invites_member_select on public.group_invites for select to authenticated using(public.is_conversation_member(conversation_id));
create policy messages_member_select on public.messages for select to authenticated using(public.is_conversation_member(conversation_id));
create policy messages_member_insert on public.messages for insert to authenticated with check(author_id=auth.uid() and public.is_conversation_member(conversation_id));
create policy messages_author_update on public.messages for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy attachments_member_select on public.message_attachments for select to authenticated using(exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_member(m.conversation_id)));
create policy attachments_author_insert on public.message_attachments for insert to authenticated with check(exists(select 1 from public.messages m where m.id=message_id and m.author_id=auth.uid()));
create policy push_self_all on public.push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('chat-media','chat-media',false,104857600,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/webm','audio/ogg','audio/mp4','application/pdf','application/zip','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
('avatars','avatars',false,20971520,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy avatar_read on storage.objects for select to authenticated using(bucket_id='avatars');
create policy avatar_write on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_update on storage.objects for update to authenticated using(bucket_id='avatars' and owner_id=auth.uid()::text);
create policy avatar_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and owner_id=auth.uid()::text);
create policy chat_media_read on storage.objects for select to authenticated using(
  bucket_id='chat-media' and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
);
create policy chat_media_write on storage.objects for insert to authenticated with check(
  bucket_id='chat-media' and public.is_conversation_member(((storage.foldername(name))[1])::uuid) and (storage.foldername(name))[2]=auth.uid()::text
);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_members;

grant execute on function public.create_group(text,text), public.preview_invite(text), public.join_group(text,text), public.open_direct(uuid), public.reset_invite(uuid) to authenticated;
revoke all on function public.rename_group(uuid,text,text), public.delete_group(uuid) from public, anon;
grant execute on function public.rename_group(uuid,text,text), public.delete_group(uuid) to authenticated;

grant select on public.profiles, public.conversations, public.conversation_members, public.group_invites, public.messages, public.message_attachments, public.push_subscriptions to authenticated;
grant insert on public.messages, public.message_attachments, public.push_subscriptions to authenticated;
grant update on public.profiles, public.conversations, public.conversation_members, public.messages, public.push_subscriptions to authenticated;
grant delete on public.conversation_members, public.push_subscriptions to authenticated;
