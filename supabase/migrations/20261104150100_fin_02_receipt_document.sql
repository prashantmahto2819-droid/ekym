-- printable receipt for a posted receipt voucher: an issued docs_documents row (kind receipt) numbered like the voucher
create or replace function public.fin_receipt_document(p_voucher uuid, p_template uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.fin_vouchers; p public.fin_parties; did uuid; code text; tpl uuid; purpose text;
begin
  select * into v from public.fin_vouchers where id = p_voucher;
  if v is null then raise exception 'Voucher not found'; end if;
  if not core.can(v.organization_id, 'fin.voucher.create') then raise exception 'Not allowed'; end if;
  if v.status <> 'posted' or v.type <> 'receipt' then raise exception 'Only posted receipt vouchers get a receipt'; end if;
  if v.document_id is not null then return v.document_id; end if;
  select * into p from public.fin_parties where id = v.party_id;
  tpl := coalesce(p_template, (select id from public.docs_templates t where t.kind = 'receipt' and t.status = 'active' and (t.organization_id = v.organization_id or t.organization_id is null) order by (t.organization_id is not null) desc, t.is_default desc limit 1));
  select string_agg(coalesce(a.name_hi, a.name), ', ') into purpose
    from public.fin_lines l join public.fin_accounts a on a.id = l.account_id where l.voucher_id = v.id and l.credit > 0;
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.docs_documents(organization_id, kind, template_id, title, ref_no, doc_date, recipient, fields, status, approved_by, approved_at, issued_at, issued_by, verify_code, source_table, source_id, created_by)
  values (v.organization_id, 'receipt', tpl, 'Receipt', v.number, v.voucher_date,
          jsonb_build_object('name', coalesce(v.party_name, p.name, ''), 'phone', p.phone, 'address', p.address),
          jsonb_build_object('receipt', jsonb_build_object(
            'payer_name', coalesce(v.party_name, p.name, ''), 'payer_address', coalesce(p.address, ''), 'payer_mobile', coalesce(p.phone, ''), 'payer_pan', coalesce(p.pan, ''),
            'amount', v.amount, 'purpose', coalesce(v.narration, purpose, ''), 'mode', coalesce(v.mode, ''), 'instrument', coalesce(v.instrument->>'no', v.instrument->>'txn', ''),
            'footer_note', 'Thank you for your support.')),
          'issued', auth.uid(), now(), now(), auth.uid(), code, 'fin_vouchers', v.id, auth.uid())
  returning id into did;
  update public.fin_vouchers set document_id = did where id = v.id;
  return did;
end $$;
grant execute on function public.fin_receipt_document(uuid, uuid) to authenticated;
