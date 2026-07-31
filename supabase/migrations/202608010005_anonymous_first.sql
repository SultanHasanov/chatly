-- Anonymous Supabase users are full Chat Brat users. Authentication remains
-- an implementation detail used for stable identity and RLS, not a login step.
create or replace function public.create_group(group_name text, group_description text default null)
returns table(conversation_id uuid, invite_code text)
language plpgsql security definer set search_path = '' as $$
declare new_id uuid; new_code text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  insert into public.conversations(kind, name, description, created_by)
  values ('group', trim(group_name), nullif(trim(group_description), ''), auth.uid()) returning id into new_id;
  insert into public.conversation_members(conversation_id, user_id, role)
  values (new_id, auth.uid(), 'owner');
  insert into public.group_invites(conversation_id, created_by)
  values (new_id, auth.uid()) returning code into new_code;
  return query select new_id, new_code;
end;
$$;
