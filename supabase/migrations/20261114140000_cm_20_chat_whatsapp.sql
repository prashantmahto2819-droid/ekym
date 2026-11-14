-- Chat, WhatsApp / Messenger style (Nov 2026): emoji reactions, edit own message (15 min), seen ticks,
-- mute, and a room-flags list for the chat list (muted, my last message, seen). Additive; old RPCs untouched.

create table if not exists public.cm_chat_reactions (
  message_id uuid not null references public.cm_chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.cm_chat_reactions enable row level security;
revoke all on public.cm_chat_reactions from anon, authenticated;

/** One reaction per person per message: same emoji again (or null) removes it. */
create or replace function public.k1_chat_react(p_message uuid, p_emoji text)
returns void language plpgsql security definer set search_path = '' as $$
declare rid uuid; cur text;
begin
  select room_id into rid from public.cm_chat_messages where id = p_message and deleted_at is null;
  if rid is null or not public.k1_chat_can_read(rid) then raise exception 'not allowed'; end if;
  select emoji into cur from public.cm_chat_reactions where message_id = p_message and user_id = auth.uid();
  if p_emoji is null or btrim(p_emoji) = '' or cur = p_emoji then
    delete from public.cm_chat_reactions where message_id = p_message and user_id = auth.uid();
  else
    insert into public.cm_chat_reactions (message_id, user_id, emoji) values (p_message, auth.uid(), btrim(p_emoji))
    on conflict (message_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  end if;
end $$;

/** Edit own text within 15 minutes. */
create or replace function public.k1_chat_edit(p_message uuid, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.cm_chat_messages;
begin
  select * into m from public.cm_chat_messages where id = p_message;
  if m.id is null or m.sender_id <> auth.uid() or m.deleted_at is not null then raise exception 'not allowed'; end if;
  if m.created_at < now() - interval '15 minutes' then raise exception 'संदेश 15 मिनट तक ही बदला जा सकता है'; end if;
  if coalesce(btrim(p_body), '') = '' and coalesce(jsonb_array_length(m.media), 0) = 0 then raise exception 'empty'; end if;
  update public.cm_chat_messages set body = left(btrim(p_body), 4000), edited_at = now() where id = p_message;
end $$;

/** Mute / unmute a room for me (no unread badge in the bottom bar). */
create or replace function public.k1_chat_mute(p_room uuid, p_muted boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.k1_chat_can_read(p_room) then raise exception 'not allowed'; end if;
  insert into public.cm_chat_members (room_id, user_id, muted) values (p_room, auth.uid(), coalesce(p_muted, false))
  on conflict (room_id, user_id) do update set muted = excluded.muted;
end $$;

/** Messages with reactions and how many others have read each of my messages. */
create or replace function public.k1_chat_messages2(p_room uuid, p_before timestamptz default null, p_limit int default 50)
returns table(id uuid, sender_id uuid, sender_name text, sender_photo text, body text, media jsonb, reply_to uuid, reply_text text, reply_name text,
              created_at timestamptz, edited_at timestamptz, deleted boolean, mine boolean, reactions jsonb, seen_by int, others int)
language sql stable security definer set search_path = '' as $$
  with base as (
    select m.* from public.cm_chat_messages m
     where m.room_id = p_room and public.k1_chat_can_read(p_room)
       and (p_before is null or m.created_at < p_before)
       and not exists (select 1 from public.cm_chat_blocks b where b.user_id = auth.uid() and b.blocked_id = m.sender_id)
     order by m.created_at desc limit least(greatest(p_limit, 1), 100)),
  oth as (select cm.user_id, cm.last_read_at from public.cm_chat_members cm where cm.room_id = p_room and cm.user_id <> auth.uid())
  select m.id, m.sender_id, public.k1_user_name(m.sender_id), public.k1_user_photo(m.sender_id),
         case when m.deleted_at is null then m.body end, case when m.deleted_at is null then m.media else '[]'::jsonb end,
         m.reply_to, (select left(coalesce(x.body, '📷'), 120) from public.cm_chat_messages x where x.id = m.reply_to),
         (select public.k1_user_name(x.sender_id) from public.cm_chat_messages x where x.id = m.reply_to),
         m.created_at, m.edited_at, m.deleted_at is not null, m.sender_id = auth.uid(),
         coalesce((select jsonb_agg(jsonb_build_object('e', r.emoji, 'n', r.n, 'mine', r.mine) order by r.n desc, r.emoji)
                     from (select x.emoji, count(*)::int n, bool_or(x.user_id = auth.uid()) mine from public.cm_chat_reactions x
                            where x.message_id = m.id group by x.emoji) r), '[]'::jsonb),
         case when m.sender_id = auth.uid() then (select count(*)::int from oth where oth.last_read_at >= m.created_at) else 0 end,
         case when m.sender_id = auth.uid() then (select count(*)::int from oth) else 0 end
    from base m order by m.created_at desc;
$$;

/** Per-room extras for the chat list: muted, was the last message mine, has the other side read it (DM). */
create or replace function public.k1_chat_room_flags()
returns table(room_id uuid, muted boolean, last_mine boolean, last_seen boolean, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select cm.room_id, cm.muted, lm.sender_id = auth.uid(),
         case when lm.sender_id = auth.uid() then not exists (
           select 1 from public.cm_chat_members o where o.room_id = cm.room_id and o.user_id <> auth.uid() and o.last_read_at < lm.created_at) end,
         lm.created_at
    from public.cm_chat_members cm
    left join lateral (select m.sender_id, m.created_at from public.cm_chat_messages m where m.room_id = cm.room_id and m.deleted_at is null order by m.created_at desc limit 1) lm on true
   where cm.user_id = auth.uid();
$$;

revoke all on function public.k1_chat_react(uuid, text), public.k1_chat_edit(uuid, text), public.k1_chat_mute(uuid, boolean),
  public.k1_chat_messages2(uuid, timestamptz, int), public.k1_chat_room_flags() from public, anon;
grant execute on function public.k1_chat_react(uuid, text), public.k1_chat_edit(uuid, text), public.k1_chat_mute(uuid, boolean),
  public.k1_chat_messages2(uuid, timestamptz, int), public.k1_chat_room_flags() to authenticated;
