# WhatsApp / Communication Engine

## Providers
| Provider | कब | ध्यान रखें |
|---|---|---|
| **Vivid Relay** (आपका gateway, QR-linked नंबर) | शोक संदेश, छोटे समूह, OTP (अभी चल रहा है) | Unofficial है, इसलिए नंबर ban का जोखिम रहता है। gap/batch limits, unique Ref tail (shokpatra में है) |
| **Meta WhatsApp Cloud API** (official) | रसीद, निमंत्रण, अभियान, बड़ी संख्या | हर नंबर के लिए Meta Business verification + WABA चाहिए। business-initiated संदेश के लिए approved template ज़रूरी। प्रति conversation/message शुल्क। कई संगठनों के नंबर जोड़ने के लिए Embedded Signup (Tech Provider) |
| **SMTP Email** | रसीद/पत्र PDF, पत्रिका | Supabase built-in mail rate-limited है, इसलिए अपना SMTP चाहिए (जैसे Zoho/Brevo/SES) |

संगठन हर काम के लिए अपना channel चुनेगा (fallback: Relay → Email)।

## प्रवाह
`कोई module` → `comms.enqueue(org, purpose, to[], template, vars)` → `comms.messages (queued)` → pg_cron हर मिनट → edge function `comms-worker` → provider → status/webhook (delivered/read) → रिपोर्ट।

- **Consent**: बिना सहमति (`comms.consents`) के marketing/अभियान संदेश नहीं जाएगा। utility (रसीद, OTP) अलग श्रेणी है। STOP लिखने पर opt-out होगा।
- **Retry**: 3 बार, exponential backoff। 401/402/403 जैसी गलती fatal मानी जाएगी और channel रुक जाएगा।
- **Cost**: Meta webhook के pricing फ़ील्ड से `messages.cost`, संगठन-वार मासिक रिपोर्ट।
- **Secrets**: token/key Supabase Vault में। shokpatra का `app_settings.relay_key` Phase 5 में Vault में move होगा (पुराना ऐप चलता रहे, इसलिए दोनों जगह पढ़ने का fallback रहेगा)।

## जैसा बना है (Phase 5)
- Tables `comms_*` (public), secrets Vault में (`comms_channels.secret_id`); सिर्फ़ `service_role` `k1_comms_channel_runtime` से decrypted secret पढ़ सकता है।
- Queue: `k1_enqueue_message` → `comms_messages(queued)` → cron `comms_tick()` (हर मिनट, `x-cron-secret` = `server_secrets.cron_secret`) → edge function `comms-worker` → provider → `k1_comms_result`। Browser बंद होने से कुछ नहीं रुकता। UI "kick" (`action:"tick"`) से तुरंत भी चला सकता है।
- Channel चुनना: `p_channel` दिया तो वही, नहीं तो उस kind का default/active channel (`k1_pick_channel`)।
- Opt-out पहले देखा जाता है (`blocked`), marketing के लिए consent ज़रूरी।
- Meta: `comms-webhook` URL `https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/comms-webhook` Meta App → WhatsApp → Configuration में डालें; verify token = secret `META_WEBHOOK_VERIFY_TOKEN`; `messages` field subscribe करें।
- Vivid Relay channel config: `relay_url`, `session`; secret = `vr_…` key। Meta: `phone_number_id`, `waba_id`; secret = permanent token। SMTP: `host, port, username, from_email, from_name`; secret = password।
