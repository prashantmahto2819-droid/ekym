# Backup और restore drill

## बैकअप की तीन परतें
1. **Supabase daily backup** — Dashboard → Database → Backups (Pro plan: 7 दिन; PITR चालू करने पर मिनट-स्तर तक)। कुछ नहीं करना है; चालू रहता है।
2. **GitHub Actions `db-backup`** (`.github/workflows/backup.yml`) — हर रविवार 03:00 IST `pg_dump` (schemas `public` + `core`, custom format + schema-only SQL) → Actions artifact, 90 दिन।
   - एक बार secret बनाएँ: repo → Settings → Secrets and variables → Actions → New repository secret → name `SUPABASE_DB_URL`, value = Supabase → Project Settings → Database → Connection string → URI (session mode, port 5432; password भरें)।
   - हाथ से चलाना: Actions → db-backup → Run workflow।
3. **संगठन का JSON export** — Admin → System health & backups → "Download … data (JSON)" (org.settings.edit या platform admin)। हर टेबल जिसमें `organization_id` है (secrets/payment keys छोड़कर)। Audit log में दर्ज होता है।

Storage (फोटो, PDF, letters bucket) database dump में नहीं आते; Supabase का storage backup अलग है (Dashboard → Storage)। बड़े buckets के लिए `supabase storage` CLI या rclone से R2 पर copy रखना अगला कदम है।

## Restore drill (हर 3 महीने, ~20 मिनट)
लक्ष्य: सिद्ध करना कि बैकअप से डेटा वापस आता है — live project को छुए बिना।
1. Actions → db-backup → latest run → artifact download → unzip (`ekym-YYYYMMDD.dump`).
2. Supabase में एक **नया free project** बनाएँ (नाम `ekym-restore-test`) → Settings → Database → connection string copy।
3. अपने PC पर PostgreSQL client (17) इंस्टॉल हो तो:
   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists -d "<test connection string>" ekym-YYYYMMDD.dump
   ```
   extension errors (`pg_net`, `pg_cron`) आएँ तो test project में पहले Database → Extensions से वही extensions चालू करें और दोबारा चलाएँ।
4. जाँच: SQL editor में `select count(*) from public.org_memberships;`, `select count(*) from public.members;`, `select count(*) from public.fin_vouchers;` — गिनती live से मिलनी चाहिए।
5. test project delete करें। परिणाम और तारीख नीचे की तालिका में लिखें।

| तारीख | किसने | dump | परिणाम |
|---|---|---|---|
| | | | |

## असली आपदा में
- Supabase project चल रहा हो पर डेटा गलत: Dashboard → Database → Backups → Restore (या PITR time चुनें)। पूरा project उस समय पर लौटता है — पहले JSON export ले लें।
- Project ही चला गया: नया project → ऊपर वाला `pg_restore` → Edge functions `supabase functions deploy` (repo `supabase/functions/`) → secrets (`SEND_SMS_HOOK_SECRET`, `GEMINI_API_KEY`, Razorpay, SMTP) दोबारा → `server_secrets.cron_secret` नया → Cloudflare Worker में नया `SUPABASE_URL`/keys → शोकपत्र साइट का `js/config.js` भी बदलें।
