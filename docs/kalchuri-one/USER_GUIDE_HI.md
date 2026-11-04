# Kalchuri One — उपयोग गाइड (हिंदी)

यही गाइड Admin → "उपयोग गाइड" पर भी दिखती है (source: `src/content/guide-hi.ts`).

## शुरुआत — लॉगिन और भूमिकाएँ

1. साइट के ऊपर दाएँ "Login" → मोबाइल नंबर (WhatsApp OTP) या ईमेल से लॉगिन करें।
2. पहली बार आने वाले सदस्य "सदस्यता फ़ॉर्म" (/join) भरें; एडमिन मंज़ूरी देगा, तब "सदस्य" के अधिकार मिलेंगे।
3. एडमिन पैनल: /admin — सिर्फ़ उन्हीं को दिखता है जिन्हें कोई भूमिका (role) दी गई है। भूमिकाएँ और अनुमतियाँ: Admin → Users & roles।
4. भाषा: ऊपर EN / हिं बटन से बदलें। डिफ़ॉल्ट अंग्रेज़ी है।

## सदस्य — सदस्यता, प्रोफ़ाइल और स्वीकृति

1. Admin → Members: आवेदन (applied) देखें → Approve/Reject। स्वीकृति पर सदस्य को WhatsApp जाता है।
2. सदस्य नंबर अपने-आप बनता है; श्रेणी (general / life / patron …) बदल सकते हैं।
3. सदस्यता का डेटा Events (निमंत्रण), Matrimony (परिवार जोड़), Comms (बल्क संदेश) में इस्तेमाल होता है।

## Kalchuri One — समाज का चौपाल (feed) और उसकी निगरानी

1. /community पर कोई भी लॉगिन सदस्य पोस्ट कर सकता है — पाठ, 6 तक फोटो, YouTube/Instagram/Facebook वीडियो link। वीडियो upload नहीं होता (मुफ़्त रखने के लिए link ही लगाएँ)।
2. विज्ञापन / व्यापारिक या चुनावी प्रचार वाली पोस्ट की पहुँच अपने-आप सीमित हो जाती है: सिर्फ़ लेखक और moderator को दिखती है, moderator को WhatsApp alert जाता है।
3. Admin → Community → "Kalchuri One feed": रिपोर्ट, छिपी पोस्ट, और "Promotional posts" panel — Allow (पूरी पहुँच) या Remove। नीचे "Promotion filter settings" में keywords/threshold बदलें।
4. फोटो वाले विज्ञापन पकड़ने के लिए Supabase में secret GEMINI_API_KEY डालना ज़रूरी है (System health पेज देखें)।
5. Paid विज्ञापन feed में नहीं, /sponsored पर अलग "प्रायोजित" सेक्शन में दिखते हैं — Admin → Ads & revenue से campaign बनाएँ।

## परिवार और वंश — Family tree, शोक संदेश

1. Admin → Families: परिवार बनाएँ/सुधारें — पुत्र, पुत्री, पत्नी, पूर्वज जोड़ें; मुखिया तय करें; भाइयों का क्रम बदलें।
2. शोक संदेश: Admin → Shok sandesh → नया → डिज़ाइन चुनें (Design studio के shok_patra template से) → गाँव/परिवार/वंश-वार लोग चुनें → समीक्षा → भेजें। भेजना server पर होता है, browser बंद कर सकते हैं।
3. एक ही दिवंगत + तिथि पर दोबारा पत्र नहीं जाता (पहले भेजा जा चुका) — ज़रूरत हो तो override checkbox।

## डिज़ाइन स्टूडियो — प्रमाणपत्र, रसीद, निमंत्रण, शोक पत्र

1. Admin → Design studio: template चुनें (certificate, receipt, invitation, shok_patra …) या खाली से बनाएँ। {{member.name}} जैसे tokens हर व्यक्ति के लिए अपने-आप भरते हैं।
2. Save के बाद यही template Documents (प्रमाणपत्र/पत्र), Events (निमंत्रण) और Shok sandesh में चुना जा सकता है।

## पत्राचार और दस्तावेज़ — Documents: पत्र, प्रमाणपत्र, register

1. Admin → Documents: नया दस्तावेज़ → template + प्राप्तकर्ता → Submit → मंज़ूरी → Issue (नंबर मिलता है, QR से /verify/<code> पर सत्यापन)।
2. Dispatch: WhatsApp/ईमेल से भेजें — Messaging channel सेट होना चाहिए।

## संदेश (WhatsApp / ईमेल) — Messaging engine

1. Admin → Messaging → Channels: Vivid Relay (अपना WhatsApp gateway), Meta Cloud API या SMTP जोड़ें; "Test" से जाँचें।
2. Campaigns: सदस्यों को bulk संदेश (marketing के लिए consent ज़रूरी; opt-out अपने-आप रुकता है)। हर संदेश में unique Ref जुड़ता है (anti-block)।
3. Queue हर मिनट चलती है; रुकी हो तो Admin → System health देखें।

## दान और लेखा — Donations, vouchers, reports

1. /donate से Razorpay भुगतान; PAID होते ही रसीद नंबर + receipt voucher (Accounts) अपने-आप।
2. Admin → Accounts: chart of accounts (एक बार Seed करें), वित्त वर्ष, parties। Vouchers: receipt/payment/journal → Post (फिर बदलता नहीं; गलती पर Cancel/Reverse)।
3. Reports: cashbook, ledger, trial balance, income & expenditure, receipts & payments — CSV/print।
4. Sponsor campaigns का "Mark paid" भी receipt voucher बनाता है (खाता 4400)।

## प्रकाशन — Blog, news, पत्रिका, central feed

1. Admin → Blogs/News: draft → Submit → editor approve → Publish। Comments: Admin → Publishing।
2. पत्रिका (PDF अंक): Admin → Publishing → Magazine issues; /magazine पर दिखते हैं।
3. Central feed: उप-संगठनों की चुनी हुई पोस्ट मुख्य संगठन की साइट पर (Nominate → central approve)।

## वेबसाइट — Pages, menus, theme, domain

1. Admin → Pages: blocks से पेज बनाएँ (hero, text, posts, contact …); "home" tick करने पर वही होम पेज बनता है। हर save का revision रहता है।
2. Admin → Website: रंग/फ़ॉन्ट theme, header/footer menus, custom domain (DNS CNAME → Cloudflare में जोड़ें → Verify)।
3. SEO: /sitemap.xml, /feed.xml अपने-आप; हर पेज का title/description पेज में भरें।

## आयोजन — Events, निमंत्रण, RSVP, check-in

1. Admin → Events: आयोजन बनाएँ → Guests (सदस्यों से import या खुद जोड़ें) → निमंत्रण भेजें (design + personal RSVP link) → reminders।
2. कार्यक्रम के दिन "Check-in" से QR स्कैन करें; Report में उपस्थिति।

## समुदाय सेवाएँ — Directory, jobs, scholarships, help, matrimony, polls

1. सदस्य /directory, /jobs, /scholarships, /help पर listing भेजते हैं → Admin → Community → Listings में approve।
2. Matrimony: 18+ प्रोफ़ाइल, पहचान सत्यापन (verify), दोनों की रुचि मिलने पर ही संपर्क नंबर खुलता है।
3. Polls: Admin → Community → Polls; सदस्य /polls पर वोट करते हैं।

## विज्ञापन और आय — Sponsors, AdSense

1. Admin → Ads & revenue → Settings: AdSense client/slot ids, ads.txt, consent banner; excluded pages (शोक/परिवार/matrimony/RSVP/donation/admin पर कभी नहीं)।
2. Campaigns: sponsor का banner + link + तारीखें + price → Active → /sponsored और slots में दिखता है; Mark paid → voucher।
3. Revenue tab: vouchers + AdSense की manual मासिक entry + campaign CTR।

## सुरक्षा और बैकअप — रोज़ का रख-रखाव

1. Admin → System health: queue, cron, moderation, pending approvals; समस्या हो तो platform admin को रोज़ 08:00 बजे WhatsApp।
2. Backup: Supabase daily backup + GitHub Actions (रविवार) pg_dump + "Download data (JSON)" बटन से संगठन का export।
3. Restore drill (हर 3 महीने): docs/kalchuri-one/BACKUP_RESTORE.md के चरण।
4. Secrets (service role, Razorpay, Gemini, Cloudflare) कभी repo में नहीं — Supabase/GitHub/Cloudflare secrets में।

