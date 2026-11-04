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
