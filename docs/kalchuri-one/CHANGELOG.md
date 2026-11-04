# Changelog

## 2026-11-04 — Phase 0 (नींव)
- Lovable हटाया: `@lovable.dev/vite-tanstack-config` की जगह सीधा `vite.config.ts` (tailwind, tsconfig paths, TanStack Start, nitro → Cloudflare, React); Google login अब सीधे Supabase OAuth से; Lovable preview-auth broker, error reporter, cron helper और `.lovable` हटाए; package का नाम `kalchuri-one`।
- `bun.lock` नया (पुराना Lovable के निजी registry mirror से बँधा था)।
- GitHub Actions CI: install, typecheck, build; logs `ci-logs/<branch>` पर। तीनों हरे।
- Cloudflare Worker `kalchuri-one` (`wrangler.jsonc`) + main पर auto-deploy step (secrets लगने पर चालू होगा)।
- `DEPLOYMENT_GUIDE.md`, `AGENTS.md`, `README.md` नए।

## 2026-11-04
- Phase 0 planning: shokpatra repo, ekym repo और लाइव EKYM डेटाबेस की जाँच के बाद vision, gap analysis, architecture, database schema/ER, roles, design studio, WhatsApp, security और roadmap docs बनाई गईं। कोड या डेटाबेस में कोई बदलाव नहीं हुआ।
