create function public.rename_group(target uuid, new_name text, new_description text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(
    select 1 from public.conversations
    where id=target and kind='group' and created_by=auth.uid()
  ) then raise exception 'forbidden'; end if;
  if char_length(trim(new_name)) < 1 or char_length(trim(new_name)) > 100 then
    raise exception 'invalid_name';
  end if;
  update public.conversations
  set name=trim(new_name), description=nullif(trim(new_description), '')
  where id=target;
end;
$$;

create function public.delete_group(target uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(
    select 1 from public.conversations
    where id=target and kind='group' and created_by=auth.uid()
  ) then raise exception 'forbidden'; end if;
  delete from public.conversations where id=target;
end;
$$;

revoke all on function public.rename_group(uuid,text,text), public.delete_group(uuid) from public, anon;
grant execute on function public.rename_group(uuid,text,text), public.delete_group(uuid) to authenticated;
