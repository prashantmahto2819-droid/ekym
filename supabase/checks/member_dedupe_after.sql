do $$ declare r record; begin
  for r in select member_no, full_name, full_name_hi, mobile, user_id is not null has_user, village, status from public.org_memberships order by member_no loop
    raise notice 'ROW % | % | % | % | account=% | % | %', r.member_no, r.full_name, r.full_name_hi, r.mobile, r.has_user, r.village, r.status; end loop;
end $$;
