# Deployment Guide

## कैसे चलता है
- हर push पर GitHub Actions (`.github/workflows/ci.yml`): install → typecheck → build। Logs branch `ci-logs/<branch>` पर जाते हैं।
- `main` पर push होने पर, अगर Cloudflare secrets लगे हों, तो `wrangler deploy` से Worker **kalchuri-one** अपने आप deploy होता है।
- Worker की सामान्य settings `wrangler.jsonc` में हैं। गुप्त keys Cloudflare में अलग से रखी जाती हैं, repo में कभी नहीं।

## पहली बार सेटअप (मालिक को करना है)

1. **Cloudflare API token बनाएँ**
   - <https://dash.cloudflare.com/profile/api-tokens> → **Create Token** → template **"Edit Cloudflare Workers"** → Use template।
   - Account Resources में अपना account चुनें → Continue → Create Token → token कॉपी करें (यह दोबारा नहीं दिखेगा)।
2. **Account ID कॉपी करें**
   - <https://dash.cloudflare.com> → बाएँ **Workers & Pages** → दाईं ओर **Account ID** → कॉपी।
3. **GitHub में दोनों secrets डालें**
   - <https://github.com/prashantmahto2819-droid/ekym/settings/secrets/actions> → **New repository secret**
   - Name `CLOUDFLARE_API_TOKEN`, value = चरण 1 का token → Add।
   - फिर Name `CLOUDFLARE_ACCOUNT_ID`, value = चरण 2 का ID → Add।
4. **पहला deploy चलाएँ**
   - <https://github.com/prashantmahto2819-droid/ekym/actions> → सबसे ऊपर वाला CI run (branch main) → **Re-run all jobs**।
   - हरा होने के बाद Cloudflare → Workers & Pages → **kalchuri-one** खुलेगा, और ऊपर उसका पता दिखेगा (`kalchuri-one.<आपका-नाम>.workers.dev`)। यह पता मुझे भेज दें, मैं `PUBLIC_SITE_URL` ठीक कर दूँगा।
5. **गुप्त keys Worker में डालें**
   - Cloudflare → Workers & Pages → kalchuri-one → **Settings → Variables and Secrets → Add** → Type **Secret**:
     - `SUPABASE_SERVICE_ROLE_KEY`: <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/settings/api-keys> से `service_role` / secret key
     - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`: <https://dashboard.razorpay.com/app/website-app-settings/api-keys>
     - `RAZORPAY_WEBHOOK_SECRET`: Razorpay webhook बनाते समय जो secret लिखें (webhook URL: `<साइट>/api/public/razorpay/webhook`)
   - Type **Text** (variable): `PUBLIC_BASE_DOMAIN` = वह डोमेन जिसके subdomain पर संगठन खुलेंगे (जैसे `kalchuri.org`); तय होने तक खाली छोड़ दें (तब हर host पर EKYM खुलेगा)।
   - Deploy दबाएँ।
6. **Supabase में साइट का पता जोड़ें**
   - <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/auth/url-configuration> → Redirect URLs → **Add URL** → `https://kalchuri-one.<आपका-नाम>.workers.dev/**` → Save।
   - Site URL अभी शोकपत्र का ही रहने दें, क्योंकि वह ऐप भी इसी लॉगिन से चलता है।
7. **(वैकल्पिक) Google से लॉगिन**
   - <https://console.cloud.google.com/apis/credentials> → Create Credentials → OAuth client ID → Web application।
   - Authorized redirect URI: `https://udxdxkyfrqlgdwwqaucu.supabase.co/auth/v1/callback`।
   - Client ID/Secret को <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/auth/providers> → Google में डालें → Enable → Save।

## Messaging (WhatsApp / ईमेल) चालू करना
1. साइट पर लॉगिन → Admin → **Messaging** → **+ Add channel**।
2. Vivid Relay: Relay URL, session name, API key (`vr_…`) → Save → **Test** (session दिखनी चाहिए)। ईमेल: SMTP host/port/username/from + password → Save → Test।
3. (Meta Cloud API के लिए) <https://developers.facebook.com/apps> → अपना app → WhatsApp → API setup से Phone number ID और permanent token लें; Webhook: Callback URL `https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/comms-webhook`, Verify token वही जो <https://supabase.com/dashboard/project/udxdxkyfrqlgdwwqaucu/functions/secrets> में `META_WEBHOOK_VERIFY_TOKEN` नाम से डालें; `messages` subscribe करें।
4. भेजे गए संदेश और स्थिति उसी पेज के Delivery log में दिखेंगे; queue हर मिनट अपने आप चलती है (pg_cron)।

## Custom domain (डोमेन तय होने के बाद)
Cloudflare → kalchuri-one → Settings → **Domains & Routes → Add → Custom domain**। संगठनों के subdomain (`*.domain`) के लिए wildcard route, और दूसरे संगठनों के अपने डोमेन के लिए Cloudflare for SaaS (Phase 9)।
