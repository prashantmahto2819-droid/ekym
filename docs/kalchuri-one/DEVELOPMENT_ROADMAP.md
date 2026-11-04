# Development Roadmap

Master prompt के 13 phases को इस क्रम में बाँटा गया है कि **हर phase के बाद कुछ चलने लायक हाथ में हो**, और मौजूदा शोकपत्र सेवा एक दिन के लिए भी बंद न हो।

| Phase | क्या बनेगा | पूरा होने की जाँच |
|---|---|---|
| **0. नींव** (Prompt phase 1–5) | नया repo/ढाँचा, GitHub Actions CI (typecheck/build/test), Cloudflare deploy, i18n hi/en, design tokens, यह docs | CI हरा; खाली app लाइव |
| **1. Core tenancy** | `core` schema: organizations (hierarchy), domains, roles/permissions, `core.can()`, audit; EKYM और "कलचुरी समाज" (root) संगठन बनाना; मौजूदा roles का mapping | RLS tests: org A का एडमिन org B का डेटा न देख/बदल सके |
| **2. वेबसाइट multi-org** (phase 6–7 का पहला भाग) | ekym टेबलों में organization_id + backfill; host से tenant; EKYM साइट `ekym.<domain>` पर; central portal होम; org dashboard + switcher | EKYM साइट पहले जैसी चले; दूसरा test संगठन अलग साइट दिखाए |
| **3. Org management** (phase 7) | सदस्यता आवेदन/स्वीकृति, member no., समिति, पद, कार्यकाल, विभाग, बैठक, agenda, कार्यवृत्त, प्रस्ताव, कार्य, घोषणाएँ, संगठन के दस्तावेज़, इतिहास/उपलब्धियाँ, वार्षिक गतिविधि रिपोर्ट | एक संगठन अपनी पूरी समिति और एक बैठक दर्ज कर सके |
| **4. Design Studio + Documents + रसीद** (phase 8) | `design-engine` TS port, template library, लेटरहेड, पत्र editor (TipTap), number series, approval, PDF (हिंदी), QR verify, dispatch, रजिस्टर; रसीद Design Engine पर; सदस्यता कार्ड | लेटरहेड पर हिंदी पत्र → स्वीकृति → PDF → WhatsApp; QR से verify |
| **5. Comms engine** (phase 10 का भाग) | channels (Vivid Relay + Meta Cloud + SMTP), Vault secrets, server-side queue + worker, consent, templates, delivery reports, cost | 500 संदेश tab बंद होने पर भी भेजे जाएँ; failure पर retry |
| **6. Family tree + शोक संदेश port** (phase 6, 10) | shokpatra के views React में (tree, lineage, suggestions, regions, approvals, send wizard), design-engine पर शोक पत्र, comms engine से भेजना; फिर पुराना ऐप read-only → बंद | सारे 22 परिवार/120 सदस्य नए app में; पुराना ऐप बंद करने से पहले checklist पास |
| **7. हिसाब-किताब** (phase 8 का भाग) | chart of accounts (संस्था template), FY, वाउचर (receipt/payment/journal/contra), cancel/reversal, cash/bank book, ledger, trial balance, I&E, receipts & payments, Excel/PDF export, Razorpay दान → auto voucher | trial balance हमेशा बराबर; locked FY में बदलाव न हो |
| **8. Publishing** (phase 9) | posts (blog/news/press), editorial workflow, categories, comments, central feed, पत्रिका (PDF/images → flipbook), views analytics, sitemap/SEO | लेखक → संपादक → प्रकाशित; central feed में nominated लेख |
| **9. Website builder** (phase 7 का दूसरा भाग) | block page builder, layouts, menu builder, theme/branding, revisions, scheduling, custom domain (Cloudflare for SaaS) | गैर-तकनीकी एडमिन नया पेज बनाकर menu में जोड़ सके |
| **10. Events + निमंत्रण** (phase 10) | events, निमंत्रण (Design Engine), guest list, RSVP link, reminders, QR check-in, post-event report | 200 मेहमानों को निमंत्रण + RSVP + check-in |
| **11. Community modules** (phase 11) | व्यापार निर्देशिका, रोज़गार, छात्रवृत्ति, professional directory, युवा/वरिष्ठ, ज्ञान केंद्र, आपात सहायता; **वैवाहिक** (privacy/consent के साथ); आंतरिक मतदान | हर module का privacy review |
| **12. विज्ञापन + revenue** (phase 12) | slots, sponsor campaigns, AdSense per org, ads.txt, consent banner, revenue dashboard (actual बनाम estimate), खर्च | शोक/वंश/वैवाहिक पेजों पर कोई विज्ञापन नहीं |
| **13. Hardening** | security review, load test, backups/restore drill, monitoring, user guide (हिंदी) | restore drill सफल |

## हर module के बाद (Definition of Done)
1. Migration + RLS + SQL tests
2. CI हरा (typecheck, build, unit tests)
3. Permissions जाँच: सही role हाँ, गलत role ना
4. Mobile (360px) पर जाँच
5. पुराने modules (ख़ासकर शोकपत्र) चलते रहें
6. docs + CHANGELOG update
7. Mock/placeholder हो तो उस पर साफ़ "MOCK" लिखा हो

## अनुमान
हर phase कई sessions का काम है। Phase 0–2 सबसे पहले ज़रूरी हैं, क्योंकि उनके बिना बाकी सब एक ही संगठन तक सीमित रह जाएगा।
