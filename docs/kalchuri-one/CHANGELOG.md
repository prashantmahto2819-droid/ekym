# Changelog

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
