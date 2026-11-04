# Changelog

## 2026-11-04 — Phase 10 (Events + निमंत्रण)
- Migration `ev_01_events`: `ev_events` (slug, title/hi, kind, समय, venue/hi, map, विवरण, cover, organizer/contact, `registration_open`, capacity, status, `invitation_template_id`), `ev_guests` (name, phone, email, group, seats, source manual|members|import|self, `token` = RSVP link + QR, rsvp none|yes|no|maybe, invited_at/reminded_at, checkin_at)। RPCs: public `k1_rsvp_info(token)`, `k1_rsvp(token, answer, seats, note)`, `k1_event_register(event, name, phone, seats)` (capacity जाँच, एक नंबर एक बार); staff `k1_event_checkin(token, undo)`, `k1_event_import_members(event, filter)`, `k1_event_stats`। `k1_enqueue_message` अब `events.manage` वालों को `ref_table='ev_events'` पर भेजने देता है। `ev_02`: documents bucket में `<org>/events/…` event managers के लिए।
- Design engine starter **निमंत्रण** (`invitationTemplate`, kind invitation, A5): `{{event.title_hi}}`, `{{event.date}}`, `{{event.time}}`, `{{event.venue_hi}}`, `{{event.message}}`, `{{guest.name}}`, `{{guest.group}}`, QR = `{{guest.rsvp_url}}`।
- Admin → **Events & invitations**: CRUD; detail में अतिथि (जोड़ें, सदस्यों से लाएँ (गाँव/श्रेणी फ़िल्टर), सूची चिपकाएँ, CSV, RSVP हाथ से), **Invitations** (WhatsApp संदेश `{{rsvp}}`/`{{name}}` + हर अतिथि का निमंत्रण चित्र QR सहित, लक्ष्य: न भेजे गए/सभी/चुने/हाँ; reminder सिर्फ़ text; preview), **Check-in** (कैमरा QR — BarcodeDetector वाले browsers, या नाम/मोबाइल/कोड से; undo), **Report** (गिनती, समूह-वार उपस्थिति, CSV)।
- Public: `/events` (आगामी/पिछले), `/events/<slug>` (पंजीकरण खुला हो तो self-register → entry code), `/rsvp/<token>` (हाँ/शायद/नहीं + सीटें + संदेश, प्रवेश QR)। Header में "Events"।
- बाकी: reminder scheduling (cron) अभी हाथ से बटन; QR scan के लिए iOS Safari पर manual search; event photos/gallery link; भुगतान वाले events (टिकट) Phase 12 के साथ।

## 2026-11-04 — Phase 9 (Website builder)
- Migration `web_01_builder`: `cms_pages` (blocks jsonb, draft/published, `publish_at` से scheduled, SEO, `is_home` = डिफ़ॉल्ट होम की जगह, `show_in_menu`), `cms_page_revisions` (हर सहेजने पर संस्करण, आख़िरी 30; `k1_page_restore`), `cms_menus` (header/footer items), `k1_set_branding` (core.organizations.branding), domains: `k1_request_domain` (org admin, custom, unverified), `k1_org_domains`, `k1_verify_domain` (platform admin), `k1_delete_domain`, `k1_pending_domains`; `k1_resolve_host` अब सिर्फ़ verified custom domain या subdomain पर resolve करता है।
- `src/components/site/Blocks.tsx`: block model + renderer — hero, text (**bold**, paragraphs), image, gallery, cards, CTA, stats, embed (YouTube/map auto), latest posts, contact, spacer, divider; हर block में हिंदी fields (`*_hi`) भाषा toggle से बदलते हैं।
- Admin → **Pages**: सूची + builder (ब्लॉक जोड़ें/क्रम/बदलें/हटाएँ, live preview, settings: slug, हिंदी शीर्षक, publish time, SEO, home, menu; revisions restore; publish/unpublish)। Admin → **Website**: Theme (primary/accent रंग, heading/body font, radius → `themeCss` से `<style>` root में), Menus (header: items + sub-items → "More"; footer links), Domains (subdomain जानकारी, custom domain request + DNS steps; platform admin verify)।
- Public: `/p/<slug>`; published home page हो तो `/` उसी को दिखाता है; Header/Footer builder menus पढ़ते हैं (खाली = default); builder pages sitemap में।
- बाकी: media library (upload से URL), drag-and-drop ordering, block templates/presets, Cloudflare for SaaS से custom domain अपने आप (अभी Worker पर हाथ से add), per-page custom CSS।

## 2026-11-04 — Phase 8 (Publishing)
- Migration `pub_01_publishing` (मौजूदा `blogs`/`news` पर additive): `cms_categories`; blogs/news में category, tags, byline, review_note/submitted_at/reviewed_*, `central_status` (none|nominated|approved|declined), views, featured (news: content/content_hi, breaking)। लेखक (`cms.post.create`) अपने draft/review बना-बदल सकते हैं; समीक्षक (`cms.post.review`) सब देखते हैं। RPCs `k1_post_submit`, `k1_post_decide` (publish | changes with note | unpublish), `k1_post_nominate`, `k1_central_decide` (parent संगठन का publisher), `k1_central_feed(org)` (descendant संगठनों के approved + अपने published), `k1_post_view`। `cms_comments` (anon insert, moderated), `pub_issues` + bucket `publications` (cover, PDF, page images; access public|members), `k1_issue_view`।
- `pub_02_tenant_parent`: `k1_resolve_host` / `k1_org_by_slug` अब `parent_id`, `child_count` भी देते हैं (Tenant type)।
- Admin → Blogs / News अब `PostsPage` (editorial): Submit → Changes/Publish/Unpublish, "Nominate ↑" (parent हो तो), review queue count, हिंदी fields। Admin → **Publishing**: comments moderation, categories, central feed approvals (sub-orgs के nominations), magazine issues (cover/PDF/pages upload)।
- Public: blog/news पर टिप्पणियाँ + view counter; `/feed` (central feed); `/magazine`, `/magazine/<slug>` (page-flip reader: ← → keys, thumbnails; नहीं तो PDF embed); `/sitemap.xml`, `/feed.xml` (RSS) हर संगठन के host पर; head में RSS/sitemap links; Header में "Magazine"।
- `CrudPage`: `createdBy`, `toolbar`, `rowClass` props।
- बाकी: rich-text (TipTap) editor, media library, scheduled publish job (published_at भविष्य = scheduled, अभी status से), views analytics dashboard, पत्रिका के PDF से पेज-छवियाँ अपने आप।

## 2026-11-04 — Phase 7 (हिसाब-किताब · double entry)
- Migration `fin_01_accounting`: `fin_accounts` (संगठन-वार chart; समूह/नकद/बैंक flags, opening balance), `fin_years` (अप्रैल–मार्च, अपने आप बनता है; `fin_lock_year` से बंद — trigger `fin_guard_locked` बंद वर्ष में कोई बदलाव नहीं होने देता), `fin_parties`, `fin_vouchers` (receipt/payment/journal/contra; draft → posted → cancelled; नंबर series `<SHORT>/R|P|J|C/0001` post पर; `source`/`source_id` से दान/सदस्यता से जुड़ाव), `fin_lines`। RPCs: `fin_seed_accounts` (संस्था template, 26 खाते), `fin_post_voucher` (डेबिट = क्रेडिट, ≥2 पंक्तियाँ, समूह/निष्क्रिय खाते नहीं, बंद वर्ष नहीं), `fin_cancel_voucher` (कारण ज़रूरी; `fin.voucher.cancel`), `fin_reverse_voucher` (उलटा journal, मूल को `reversed_by`), रिपोर्ट `fin_trial_balance`, `fin_ledger` (running balance), `fin_cashbook`, `fin_receipts_payments`, `fin_voucher_detail`। **Razorpay दान PAID → trigger `trg_fin_donation_paid` → receipt voucher (बैंक Dr / दान आय Cr) अपने आप**; पुराने भुगतान `fin_import_paid_donations` से।
- `fin_02_receipt_document`: posted receipt voucher से design-engine रसीद (`docs_documents` kind receipt, नंबर = वाउचर नंबर, verify code, `receipt.*` merge fields) → PDF/WhatsApp Letters पेज से।
- Admin → **Accounts** group: *Chart of accounts & years* (मानक खाते बनाना, जोड़ना/बदलना, वर्ष बंद/खोलना), *Vouchers & receipts* (सूची + अवधि/प्रकार/स्थिति/खोज, CSV; नया वाउचर; receipt/payment का आसान फ़ॉर्म = नकद/बैंक खाता + मदें; journal/contra का Dr/Cr grid; post, print, रसीद, reversal, रद्द), *Books & reports* (रोकड़/बैंक बही, खाता बही, तलपट, आय-व्यय, प्राप्ति-भुगतान; CSV/Excel + प्रिंट→PDF)।
- Permissions (पहले से seeded): treasurer = `fin.*`; president/auditor = रिपोर्ट देखना; `fin.fy.lock` वर्ष बंद करने के लिए।
- बाकी: bills/GST (sales/purchase), बजट बनाम वास्तविक, बैंक statement import/reconciliation, सदस्यता शुल्क → auto voucher (Phase 3 की membership fee flow जुड़ने पर)।

## 2026-11-04 — Phase 6c (शोक संदेश Kalchuri One में)
- Design engine starter **शोकपत्र** (`shokPatraTemplate`, kind `shok_patra`, 1050×1491): दीया + श्रद्धांजलि, `{{shok.deceased}}`, `{{shok.death_date|date}}`, `{{shok.ceremony_date|date}}`, `{{shok.venue}}`, `{{shok.family}}`; हर व्यक्ति के लिए `{{recipient.name}}`, `{{recipient.father_line}}` ("(पिता: …)" या खाली), `{{recipient.village}}`। Studio में किसी भी संगठन के लिए copy/edit।
- Admin → **Shok sandesh**: सूची (भेजे/असफल/बाकी, स्थिति), एडमिन मंज़ूर/अस्वीकार (`decide_letter`), असफल दोबारा (`send-letters` retry), ड्राफ़्ट हटाना।
- **Send wizard** (`/admin/shok/send`): जानकारी + live preview → प्राप्तकर्ता (गाँव / क्षेत्र / परिवार / वंश-वार, खोज, "पहले भेजा जा चुका" धुँधला (`already_covered_members`), जीवित पति वाली पत्नी सिर्फ़ हाथ से, each_member में बिना नंबर वाले नहीं) → जाँच (परिवार-वार n/total, cross-check checkbox) → हर व्यक्ति का JPEG design engine से → bucket `letters` → `create_letter_recipients` → `submit_letter` (एडमिन का सीधे queued, बाकी pending_approval)। भेजना शोकपत्र के server-side cron (`send_letters_tick` → `send-letters`) से — tab बंद होने पर भी चलता है।
- Migration `shok_01_org_link`: `letters.organization_id` (nullable)।
- निर्णय: शोक संदेश अभी शोकपत्र के Vivid Relay pipeline से जाते हैं (comms engine से नहीं), ताकि दोनों ऐप एक ही कतार/स्थिति दिखाएँ; शोकपत्र बंद होने पर comms engine पर ले जाएँगे। Kalchuri One की भूमिकाएँ (`shok.approve`) अभी `decide_letter` में नहीं जुड़ीं — शोकपत्र एडमिन ही मंज़ूर करता है।
- अभी शोकपत्र में ही: अपनी फोटो पर नाम-बॉक्स वाला पुराना तरीका, पत्र में संपादन (`#/send/edit`), नाम सुझाव, वंश-कड़ी अनुरोध, परिवार मिलाना, Roman→हिंदी।

## 2026-11-04 — Phase 6b (वंश वृक्ष: संपादन)
- चार्ट में ही संपादन (FamilyEcho शैली): सदस्य चुनने पर बटन — + पुत्र / + पुत्री / + पत्नी, ⬆ पूर्वज जोड़ें (`add_parent_above`), बदलें, मुखिया बनाएँ (`set_family_head`), भाइयों का क्रम ◀ ▶ (`sort_order`), ले जाएँ (एडमिन, `move_member`), हटाएँ (सिर्फ़ यह → `remove_member_keep_children`, या नीचे वालों समेत)।
- `MemberDialog`: नाम/नाम याद नहीं/दिवंगत/रिश्ता/मोबाइल (duplicate जाँच `phone_check`: एडमिन override `phone_dup_ok`, या बिना नंबर)/मूल ग्राम (datalist; सूची में न हो तो `request_origin_village`)/निवास (`ensureVillage`)।
- परिवार: नया परिवार (सूची पेज), जानकारी बदलना, मंज़ूरी के लिए भेजना, बदलाव के लिए खोलना (`reopen_family`), एडमिन: मंज़ूर/अस्वीकार (`decide_family`, first-wins)/ड्राफ़्ट में/कचरा (`trash_family`)।
- अभी शोकपत्र में ही: वंश-कड़ी का अनुरोध, परिवार मिलाना, "पुत्रों के परिवार जोड़ें", नाम सुझाव, Roman→हिंदी transliteration। Phase 6c में शोक संदेश भेजना।

## 2026-11-04 — Phase 6a (वंश वृक्ष: पढ़ने का हिस्सा)
- Migration `family_01_bridge` (additive): शोकपत्र के `is_approved()` / `admin_can_manage_family()` अब Kalchuri One की भूमिकाएँ भी मानते हैं — `family.manage` वाला user approved गिना जाता है; संगठन में `social_region_id` हो तो उसी क्षेत्र के परिवार, न हो तो सभी (राष्ट्रीय संगठन); platform admin सब। नए RPC `k1_family_ctx()`, `k1_families(status,q)`।
- `src/family/layout.ts`: FamilyEcho जैसा chart layout — पीढ़ियाँ पंक्तियों में, पति-पत्नी साथ (सुनहरी रेखा), संतानें दंपति के नीचे बीच में, bus connectors, पुत्री/पत्नी badges।
- `FamilyChart`: SVG, pan/zoom/fit, click → सदस्य चुनें (पूर्वज+वंशज हाइलाइट, बाकी धुँधले), वंश-दृश्य में हर परिवार का अलग रंग।
- Admin → **Family trees**: सूची (मेरे / मेरे क्षेत्र के / निर्देशिका), परिवार पेज (chart + सदस्य panel: पिता, पत्नी, संतान, वंशावली; सूची दृश्य; कड़ियाँ), **Full lineage** (जुड़े परिवार एक chart में)।
- संपादन अभी शोकपत्र ऐप में (link दिया है); Phase 6b में यहाँ आएगा।

## 2026-11-04 — Phase 5 (Communication engine: WhatsApp + ईमेल)
- Migration `comms_01_engine`: `comms_channels` (provider: vivid_relay | meta_cloud | smtp; secret Supabase **Vault** में, DB में नहीं), `comms_consents` / `comms_opt_outs`, `comms_templates`, `comms_campaigns`, `comms_messages` (server-side queue)। RPCs: `k1_enqueue_message` (permission: `comms.campaign.send`, या पत्र/बैठक/सदस्यता के अपने अधिकार), `k1_comms_set_secret`, `k1_comms_claim` (SKIP LOCKED, daily limit), `k1_comms_result` (retry = 2^n × 2 मिनट, 4 बार; 401/402/403 fatal → channel `error`), `k1_comms_status_update`, `k1_comms_opt_out`, `k1_cancel_message`, `k1_comms_stats`। pg_cron `kalchuri-comms-worker` हर मिनट `comms_tick()` (queue खाली तो कुछ नहीं)।
- Edge function **`comms-worker`** (deployed): Vivid Relay (`/api/sessions/<s>/send`, unique `Ref:` tail, gap_min–gap_max), Meta Cloud API (text/image/document/template), SMTP (nodemailer, attachments); PDF/छवि storage से signed URL द्वारा। `action:"test"` से एडमिन channel जाँचता है। **`comms-webhook`** (deployed): Meta delivery/read status + "STOP" पर opt-out (secrets `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET` dashboard में)।
- Admin → **Messaging**: channels (बनाना, secret, Test, Resume), Broadcast (active members / team / custom list; template से; marketing सिर्फ़ consent वालों को), message templates, delivery log + आँकड़े, queued संदेश cancel।
- Letters & certificates: issued दस्तावेज़ पर **Send by WhatsApp / Send by email** (PDF अपने आप store+attach, dispatch + जावक रजिस्टर entry)। Meetings: **WhatsApp notice to members**। `/join` पर संचार-सहमति checkbox → `comms_consents`।
- बाकी: शोकपत्र का `app_settings.relay_key` अभी वहीं है (पुराना ऐप चलता रहे); Meta Embedded Signup; संगठन-वार मासिक cost रिपोर्ट; campaigns का scheduling (`schedule_at`) UI।

## 2026-11-04 — Phase 4 (Universal Design Studio + दस्तावेज़ workflow)
- `src/design-engine/`: शोकपत्र के studio-engine का TypeScript port + विस्तार: mm page presets (A4/A5/Letter/ID card/square/story/शोकपत्र), master (letterhead) layers हर पेज पर, `flow` layer (body text अपने आप अगले पेज पर), merge fields (`{{org.name}}`, `{{doc.date|date}}`, `|inr`, `|words` = रुपये शब्दों में, `|upper`), QR layer, table layer, `lastPageOnly` (हस्ताक्षर/QR आख़िरी पेज पर), image-PDF export (हिंदी सही), PNG।
- Starter templates: लेटरहेड, सामान्य पत्र, प्रमाणपत्र, रसीद, सदस्यता कार्ड (`STARTER_TEMPLATES`)।
- Admin → Design Studio: templates (संगठन के + साझा), starter से बनाना, editor (drag/resize/snap, layers, properties, undo/redo, letterhead/page/last-page toggles, sample data), thumbnail, default/archive।
- Admin → Letters & certificates: दस्तावेज़ draft → submit → approve/send back → **issue** (नंबर `EKYM/L/0001`, verify code) → PDF (bucket `documents/<org>/<id>.pdf`) → dispatch record (जावक रजिस्टर में entry) → cancel। RLS: issued दस्तावेज़ बदले नहीं जा सकते।
- Admin → Inward/outward register (`docs_register`, auto entry numbers)।
- Public `/verify/<code>`: QR से दस्तावेज़ की सच्चाई (जारीकर्ता, नंबर, तारीख, स्थिति)।
- CI में नया smoke test: headless Chromium में पाँचों templates render + PDF + pagination जाँच (`scripts/smoke-engine.mjs`, PNG logs में)। Runner `ubuntu-24.04`।
- बाकी (अगले phases): Razorpay auto-receipt अभी पुराने pdf-lib रास्ते पर है (Phase 7 में engine पर आएगा); WhatsApp/email से भेजना Phase 5; शोकपत्र designs का import Phase 6; दस्तावेज़ upload UI।

## 2026-11-04 — Phase 3 (संगठन प्रबंधन)
- टेबल (public schema, `org_`/`gov_` prefix): `org_memberships` (आवेदन → स्वीकृति → सदस्य संख्या, पहला फ़ैसला मान्य, मोबाइल normalise), `org_number_series` + `k1_next_number()` (गैप-रहित शृंखला: सदस्य `EKYM/M/0001`, प्रस्ताव `EKYM/R/0001`), `gov_committees`, `gov_positions` (+ public view बिना फ़ोन), `gov_meetings` (agenda, उपस्थिति, कार्यवृत्त draft→submitted→approved, approved होने पर lock), `gov_agenda_items`, `gov_resolutions` (auto-number), `gov_tasks`, `gov_announcements` (public/members/team), `org_documents`, `org_milestones`, bucket `org-files`।
- RPC: `k1_decide_membership`, `k1_claim_memberships` (लॉगिन के बाद मोबाइल से आवेदन जोड़ना), `k1_org_stats`।
- Admin: Members (आवेदन स्वीकृति + सदस्य सूची), Committees & office bearers, Meetings (सूची + विवरण पेज), Tasks, Announcements, Documents & history। `CrudPage` में foreign-key select, filter, datetime, row-click।
- Public: `/join` (द्विभाषी सदस्यता फ़ॉर्म), `/team` (समितियाँ व पदाधिकारी)। Header/footer में लिंक।
- Tests: `supabase/tests/org_management_test.sql` (11 checks पास)।
- CI अब build के बाद typecheck चलाता है (route tree ताज़ा रहे) और `routeTree.gen.ts` logs में देता है।
- अभी बाकी (अगले phases में): सदस्यता कार्ड PDF (Design Studio), बैठक notice WhatsApp से (Comms engine), दस्तावेज़ upload UI, विभाग-वार सदस्य, चुनाव/मतदान।

## 2026-11-04 — Phase 2 (वेबसाइट multi-organization + भाषा)
- वेबसाइट की सभी 30 टेबलों में `organization_id` (पुरानी पंक्तियाँ EKYM से जुड़ीं); slug अब हर संगठन में अलग; सारी RLS `core.can()` पर।
- Tenant: server host से संगठन पहचानता है (`core.org_domains` → `<slug>.PUBLIC_BASE_DOMAIN` → `DEFAULT_ORG_SLUG`=ekym)। हर public query, फ़ॉर्म, दान और admin पेज उसी संगठन तक सीमित।
- Public RPC wrappers `k1_*` (resolve_host, org_by_slug, my_orgs, can, org_team, org_roles, assign_role, remove_role)।
- Roles अब `core` से (`k1_my_orgs`); admin "Users & roles" पेज core roles को ईमेल से assign/remove करता है। पुरानी `user_roles` टेबल अब इस्तेमाल में नहीं।
- भाषा: default English, header में "हिंदी/English" toggle (cookie, SSR); content में `*_hi` fields; Organization settings में हिंदी नाम/टैगलाइन/परिचय।
- Page titles, consent text और PDF में संगठन का नाम tenant से।
- Footer credit "Designed & Developed by Vivid Brandify" (दोनों भाषाओं में)।

## 2026-11-04 — Phase 1 (core tenancy)
- नया `core` schema: organizations (hierarchy + closure table `org_tree`, cycle रोक), org_domains, permissions (41), system role templates (11), departments, role_assignments, platform_admins, audit_log (generic trigger)।
- Helpers: `core.can(org, perm)` (exact / `module.*` / `*`), `is_platform_admin`, `is_org_team`, `can_oversee` (parent org, सिर्फ़ `share_with_parent` होने पर), `can_grant` (privilege escalation रोक), `my_orgs`, `resolve_host` (public साइट के लिए)।
- Guards: सामान्य यूज़र का बनाया संगठन हमेशा `pending`; status/slug सिर्फ़ platform admin बदल सकता है; parent बदलने के लिए नए parent में अधिकार ज़रूरी; बनाने वाला अपने आप उस संगठन का एडमिन बनता है।
- Seed: "Kalchuri Samaj / कलचुरी समाज" (root, national) और उसके नीचे "Ekatm Kalar Yuva Manch / एकात्म कलार युवा मंच"। शोकपत्र के super admin को platform admin बनाया, ekym वेबसाइट के SUPER_ADMIN को EKYM का org_admin, और शोकपत्र के 4 एडमिन को root में "Family Tree Admin"।
- `supabase/tests/core_tenancy_test.sql`: 21 isolation checks, सभी पास। इस test ने एक बग भी पकड़ा: नया संगठन बनाने वाला खुद उसका एडमिन नहीं बन पा रहा था। इसे `core_03_creator_bootstrap` में ठीक किया।
- Footer में सभी संगठनों की साइट पर स्थायी पंक्ति: "Designed & Developed by Vivid Brandify"।
- निर्णय: वेबसाइट की default भाषा English होगी, साथ में Hindi का toggle; content में `name` / `name_hi` जैसे जोड़े।

## 2026-11-04 — Phase 0 (नींव)
- Lovable हटाया: `@lovable.dev/vite-tanstack-config` की जगह सीधा `vite.config.ts` (tailwind, tsconfig paths, TanStack Start, nitro → Cloudflare, React); Google login अब सीधे Supabase OAuth से; Lovable preview-auth broker, error reporter, cron helper और `.lovable` हटाए; package का नाम `kalchuri-one`।
- `bun.lock` नया (पुराना Lovable के निजी registry mirror से बँधा था)।
- GitHub Actions CI: install, typecheck, build; logs `ci-logs/<branch>` पर। तीनों हरे।
- Cloudflare Worker `kalchuri-one` (`wrangler.jsonc`) + main पर auto-deploy step (secrets लगने पर चालू होगा)।
- `DEPLOYMENT_GUIDE.md`, `AGENTS.md`, `README.md` नए।

## 2026-11-04
- Phase 0 planning: shokpatra repo, ekym repo और लाइव EKYM डेटाबेस की जाँच के बाद vision, gap analysis, architecture, database schema/ER, roles, design studio, WhatsApp, security और roadmap docs बनाई गईं। कोड या डेटाबेस में कोई बदलाव नहीं हुआ।
