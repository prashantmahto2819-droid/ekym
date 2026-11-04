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
