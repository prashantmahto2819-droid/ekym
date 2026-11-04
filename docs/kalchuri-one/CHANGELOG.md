# Changelog

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
