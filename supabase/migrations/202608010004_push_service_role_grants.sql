-- The Edge Function uses service_role to resolve recipients and clean expired endpoints.
grant select on table public.conversations to service_role;
grant select on table public.profiles to service_role;
grant select on table public.conversation_members to service_role;
grant select, delete on table public.push_subscriptions to service_role;
