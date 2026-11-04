# Kalchuri One — notes for coding agents

Read `docs/kalchuri-one/README.md` first (vision, architecture, schema, roadmap).

- Stack: React 19 + TanStack Start (SSR) + Tailwind 4 + shadcn/ui, built by Vite with nitro → Cloudflare Workers (`vite.config.ts`).
- No Lovable: this repo is no longer connected to Lovable.
- Backend: Supabase project EKYM (`udxdxkyfrqlgdwwqaucu`), shared with the live शोकपत्र app (repo `shokpatra`). Never drop/rename its `public` tables; additive migrations only.
- The Claude sandbox cannot reach the npm registry. Verification runs in GitHub Actions (`.github/workflows/ci.yml`); each push publishes logs to branch `ci-logs/<branch>` (`RESULT.txt`, `typecheck.log`, `build.log`).
- Owner is Hindi-speaking: reply in Hindi; when the owner must do something, give ordered steps with links.
