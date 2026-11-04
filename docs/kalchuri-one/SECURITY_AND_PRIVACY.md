# Security & Privacy

- **Tenant isolation**: हर org टेबल पर RLS + `core.can()`; हर module के लिए SQL tests कि दूसरे संगठन का डेटा न दिखे।
- **SECURITY DEFINER functions**: `search_path` fixed; अंदर permission check; अनावश्यक EXECUTE grants हटाना।
- **Secrets**: Vault में; client को कभी न भेजें; service role key सिर्फ़ server/edge में।
- **Personal data (DPDP Act 2023)**: हर संग्रह का उद्देश्य और सहमति दर्ज; सदस्य अपना डेटा देख/सुधार/हटाने का अनुरोध कर सके; वंश वृक्ष में बिना-signup व्यक्तियों के फ़ोन/पता सिर्फ़ scoped एडमिन को दिखें; visibility levels (public / समाज / परिवार / निजी)।
- **Matrimonial**: कानूनी न्यूनतम आयु की जाँच, profile verification, दोनों तरफ़ की सहमति के बाद ही संपर्क, abuse report, फ़ोटो blur विकल्प।
- **Elections**: ballot user से अलग table में; voter token एक बार; नतीजे सिर्फ़ voting window बंद होने के बाद।
- **Finance**: posted voucher immutable; cancel = reversal; FY lock; audit log।
- **Audit**: सभी बदलाव `core.audit_log` में; super admin और org auditor देख सकें।
- **Backups**: Supabase daily backup + हर बड़े migration से पहले `pg_dump` (schema + data)। Phase 13 में restore drill।
- **Ads**: शोक संदेश, वंश वृक्ष, वैवाहिक और बच्चों से जुड़े पेजों पर विज्ञापन नहीं; consent banner; ads.txt।

## Phase 13 hardening (2026-11-04) — किया गया
- **Function grants**: migration `sec_01_function_grants` — हर public function से PUBLIC/anon EXECUTE हटाया; anon सिर्फ़ allow-list (ads, feed read, RSVP, event register, issue/listing/post view, resolve host, verify)। Server-internal functions (ticks, digests, comms claim/result, fin_ensure_*) authenticated से भी हटे। Trigger functions से सब हटाया (trigger चलाने के लिए EXECUTE नहीं चाहिए — जाँचा हुआ)। `alter default privileges … revoke execute on functions from anon, public` — नई functions को anon तभी मिलेगा जब migration में लिखा हो।
- **Rate limits**: posts 20/घंटा, comments 60/घंटा, listings 10/दिन, reports 30/दिन प्रति user (`k1_rate_guard` triggers)।
- **Indexes**: बढ़ने वाली tables के FK पर (`perf_01_fk_indexes`)।
- **Health**: `k1_health()` (platform admin), `/api/public/health` (uptime monitor), रोज़ 08:00 IST digest `send_health_digest()` जब समस्या हो।
- **Export/backup**: `k1_org_export`, weekly `db-backup` workflow, `BACKUP_RESTORE.md` drill।
- बाकी (advisor): `auth_rls_initplan` (policies में `auth.uid()` को `(select auth.uid())` करना — scale पर), `multiple_permissive_policies` (core.* read+write policies merge), Supabase Auth → "Leaked password protection" dashboard से चालू करना (owner)।
