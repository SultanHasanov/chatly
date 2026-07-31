-- Explicit Data API privileges for projects created with
-- "Automatically expose new tables" disabled. RLS remains authoritative.
grant select on public.profiles to authenticated;
grant update (display_name, avatar_path, updated_at) on public.profiles to authenticated;

grant select on public.conversations to authenticated;
grant update (name, description, avatar_path) on public.conversations to authenticated;

grant select on public.conversation_members to authenticated;
grant update (last_read_at, pinned, notifications) on public.conversation_members to authenticated;
grant delete on public.conversation_members to authenticated;

grant select on public.group_invites to authenticated;

grant select, insert on public.messages to authenticated;
grant update (body, edited_at, deleted_at) on public.messages to authenticated;

grant select, insert on public.message_attachments to authenticated;

grant select, insert, update, delete on public.push_subscriptions to authenticated;

grant execute on function public.create_group(text,text) to authenticated;
grant execute on function public.preview_invite(text) to authenticated;
grant execute on function public.join_group(text,text) to authenticated;
grant execute on function public.open_direct(uuid) to authenticated;
grant execute on function public.reset_invite(uuid) to authenticated;
