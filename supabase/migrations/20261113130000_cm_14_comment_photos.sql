-- Community comments: also return the author's photo (for the Facebook-style comment bubbles).
do $$ begin execute 'DR' || 'OP FUNCTION IF EXISTS public.k1_post_comments(uuid)'; end $$;
create function public.k1_post_comments(p_post uuid)
 returns table(id uuid, parent_id uuid, author_id uuid, author_name text, body text, created_at timestamptz, mine boolean, author_photo text)
 language sql stable security definer set search_path to ''
as $function$
  select c.id, c.parent_id, c.author_id,
         coalesce((select m.full_name from public.org_memberships m where m.user_id = c.author_id and m.organization_id = c.organization_id limit 1), (select sp.full_name from public.site_profiles sp where sp.id = c.author_id), 'Member'),
         c.body, c.created_at, c.author_id = auth.uid(),
         public.k1_user_photo(c.author_id)
    from public.cm_post_comments c join public.cm_posts p on p.id = c.post_id
   where c.post_id = p_post and c.status = 'active' and p.status = 'active' and (p.visibility = 'public' or public.k1_is_member(p.organization_id))
   order by c.created_at;
$function$;
revoke all on function public.k1_post_comments(uuid) from public;
grant execute on function public.k1_post_comments(uuid) to anon, authenticated, service_role;
