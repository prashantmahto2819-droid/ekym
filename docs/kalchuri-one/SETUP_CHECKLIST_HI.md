# Kalchuri One — Cloudflare + Supabase पूरा सेटअप (क्रम से, links के साथ)

स्थिति (4 नवंबर 2026): कोड `main` पर तैयार और CI हरा है, Supabase का database/edge functions लगे हैं, पर **Cloudflare deploy अभी नहीं हुआ** (GitHub में Cloudflare secrets नहीं हैं — CI में deploy step "skipped" दिखता है)। नीचे के भाग A–F क्रम से करने पर साइट live हो जाएगी। ✅ = ज़रूरी, ⭕ = वैकल्पिक।

Project ids: Supabase project **EKYM** = `udxdxkyfrqlgdwwqaucu`; GitHub repo = `prashantmahto2819-droid/ekym`; Worker का नाम = `kalchuri-one`.

---

## A. Cloudflare → साइट live (✅, ~15 मिनट)
1. API token: <https://dash.cloudflare.com/profile/api-tokens> → **Create Token** → template **Edit Cloudflare Workers** → Use template → Account Resources: अपना account → Continue to summary → Create Token → token copy (दोबारा नहीं दिखेगा)।
2. Account ID: <https://dash.cloudflare.com> → Workers & Pages → दाईं ओर **Account ID** copy।
3. GitHub secrets: <https://github.com/prashantmahto2819-droid/ekym/settings/secrets/actions> → New repository secret:
   - `CLOUDFLARE_API_TOKEN` = चरण 1 का token
   - `CLOUDFLARE_ACCOUNT_ID` = चरण 2 का ID
4. Deploy: <https://github.com/prashantmahto2819-droid/ekym/actions> → सबसे ऊपर का run (branch main) → **Re-run all jobs** → हरा होने पर step "Deploy to Cloudflare" चला होगा।
5. Worker का पता: <https://dash.cloudflare.com> → Workers & Pages → **kalchuri-one** → ऊपर `kalchuri-one.<account>.workers.dev` — यह पता मुझे भेजें (मैं `PUBLIC_SITE_URL` ठीक करूँगा)।
6. Worker secrets: kalchuri-one → Settings → **Variables and Secrets** → Add:
   | Name | Type | कहाँ से |
   |---|---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret | <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/settings/api-keys> → service_role / secret key |
   | `RAZORPAY_KEY_ID` | Secret | <https://dashboard.razorpay.com/app/website-app-settings/api-keys> |
   | `RAZORPAY_KEY_SECRET` | Secret | वही पेज |
   | `RAZORPAY_WEBHOOK_SECRET` | Secret | Razorpay → Settings → Webhooks → Add: URL `https://<site>/api/public/razorpay/webhook`, events `payment.captured`, `payment.failed`; जो secret लिखें वही यहाँ |
   | `PUBLIC_BASE_DOMAIN` | Text | वह domain जिसके subdomain पर संगठन खुलेंगे (जैसे `kalchuri.org`); तय न हो तो खाली |
   फिर **Deploy** दबाएँ।
7. Domain (जब तय हो): kalchuri-one → Settings → **Domains & Routes** → Add → Custom domain → `kalchuri.org` और `*.kalchuri.org` (wildcard के लिए domain Cloudflare DNS पर होना चाहिए: <https://dash.cloudflare.com> → Add a domain → nameservers बदलें)।

## B. Supabase Auth (✅, ~5 मिनट)
1. Redirect URLs: <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/auth/url-configuration> → Redirect URLs → Add → `https://kalchuri-one.<account>.workers.dev/**` (और बाद में `https://kalchuri.org/**`, `https://*.kalchuri.org/**`) → Save। Site URL शोकपत्र का ही रहने दें।
2. Phone (WhatsApp OTP) पहले से शोकपत्र के hook से चलता है — कुछ नहीं करना।
3. ⭕ Google login: <https://console.cloud.google.com/apis/credentials> → Create credentials → OAuth client ID → Web → Authorized redirect URI `https://udxdxkyfrqlgdwwqaucu.supabase.co/auth/v1/callback` → Client ID/Secret को <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/auth/providers> → Google → Enable → Save।
4. ⭕ Leaked password protection: <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/auth/providers> → Email → "Prevent use of leaked passwords" (Pro plan)।

## C. Supabase Edge Function secrets (✅ जो चाहिए)
<https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/functions/secrets> → Add new secret:
| Name | किसके लिए | कहाँ से |
|---|---|---|
| `GEMINI_API_KEY` | Kalchuri One की फोटो+पाठ वाली विज्ञापन-जाँच (`cm-moderate`) ✅ | <https://aistudio.google.com/apikey> → Create API key (free tier काफ़ी) |
| `MODERATION_MODEL` | ⭕ default `gemini-2.5-flash` | — |
| `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` | ⭕ सिर्फ़ Meta WhatsApp Cloud API इस्तेमाल करने पर (`comms-webhook`) | <https://developers.facebook.com/apps> → app → Settings → Basic (App secret); verify token आप खुद कोई शब्द रखें |
| `SEND_SMS_HOOK_SECRET` | पहले से है (शोकपत्र OTP) | — |

## D. Messaging चालू (✅ WhatsApp alerts के लिए)
1. साइट पर admin लॉगिन → Admin → **Messaging** → + Add channel → **Vivid Relay**: Relay URL, session, API key (`vr_…`) → Save → **Test**।
2. ⭕ Email: उसी जगह SMTP (host, port 587, user, password, from) → Test।
3. ⭕ Meta Cloud API: Phone number ID + permanent token; webhook Callback URL `https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/comms-webhook`, Verify token = भाग C वाला; `messages` subscribe।
4. जाँच: Admin → System health → "Messaging queue" में channels_active ≥ 1।

## E. Backups (✅ 10 मिनट)
1. DB dump: <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/settings/database> → Connection string → **URI**, Session mode (port 5432), password भरें → GitHub secret `SUPABASE_DB_URL` (<https://github.com/prashantmahto2819-droid/ekym/settings/secrets/actions>) → Actions → **db-backup** → Run workflow → artifact दिखे।
2. ⭕ Storage → R2 copy (`storage-backup` workflow):
   - Supabase S3 keys: <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/settings/storage> → S3 Access Keys → New access key → secrets `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET_KEY`।
   - Cloudflare R2: <https://dash.cloudflare.com> → R2 → Create bucket (नाम `kalchuri-backup`, region APAC) → R2 → Manage R2 API tokens → Create API token (Object Read & Write) → secrets `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID` (Account ID), `R2_BUCKET` = `kalchuri-backup`।
   - Actions → **storage-backup** → Run workflow।
3. Restore drill: `docs/kalchuri-one/BACKUP_RESTORE.md`।

## F. Monitoring (⭕ 5 मिनट)
1. <https://uptimerobot.com> → Add New Monitor → HTTP(s) → URL `https://<site>/api/public/health` → interval 5 min → alert contact (email/WhatsApp)।
2. Admin → System health पेज: रोज़ 08:00 IST पर समस्या हो तो platform admin के WhatsApp पर digest (भाग D ज़रूरी)।

## G. Ads (⭕ जब कमाई शुरू करनी हो)
1. <https://www.google.com/adsense> → Sites → Add site (अपना domain) → review।
2. Publisher id (`ca-pub-…`) → Admin → Ads & revenue → Settings; Display ad units बनाकर slot ids डालें; ads.txt snippet paste; "Show ads" tick → Save।

## H. शोकपत्र साइट (पहले से live, बदलाव नहीं)
- Cloudflare Pages project `shokpatra` (repo `shokpatra`, build command खाली, output `/`)। Kalchuri One उसी Supabase को साझा करता है; शोकपत्र का `js/config.js` वही रहता है।

---
### बाद में (जब मैं बताऊँ)
- Worker पता मिलते ही `wrangler.jsonc` में `PUBLIC_SITE_URL` और `index.html`/sitemap की absolute URLs अपडेट — मैं करूँगा।
- Domain तय होने पर `PUBLIC_BASE_DOMAIN` + wildcard route + हर संगठन का subdomain Admin → Website → Domains से।
