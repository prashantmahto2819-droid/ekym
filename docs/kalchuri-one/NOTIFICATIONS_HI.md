# सूचनाओं का पैटर्न (Notification matrix)

**नियम (owner, 2026-11-05):**
1. हर सूचना **ईमेल** से हमेशा जाती है। संस्था का अपना SMTP हो तो उसी से; नहीं तो Kalchuri One (मंच) के SMTP से उसकी ओर से (अस्थायी)।
2. **WhatsApp** से तब जाती है जब संस्था का अपना WhatsApp channel (Vivid Relay / Meta Cloud) हो; नहीं तो मंच का channel (owner का gateway)।
3. Admin को जाने वाली सूचनाएँ **in-app** (🔔 घंटी + डैशबोर्ड) भी होती हैं।
4. संस्था के admin को, जब तक अपना SMTP/WhatsApp न जोड़ें, **हर सोमवार 09:00 IST** याद दिलाया जाता है (`k1_channel_reminders`), और भूमिका मिलते ही पहली याद उसी संदेश में।
5. Channel चुनाव: `k1_pick_channel(org, kind)` = संस्था का अपना active channel → मंच (root org) का channel → कुछ नहीं (संदेश नहीं जाता, कोई error नहीं)।

Engine: `comms_messages` कतार (हर मिनट `comms-worker`, SMTP = nodemailer, WhatsApp = Vivid Relay/Meta)। सारे संदेश Admin → Messaging → delivery log में दिखते हैं।

| # | घटना | किसे | in-app | ईमेल | WhatsApp | कहाँ से (कोड) |
|---|---|---|---|---|---|---|
| 1 | नया सदस्यता आवेदन (`applied`) | संस्था के admin (`org.member.approve`) + platform admins | ✅ | ✅ | ✅ (संस्था channel + owner gateway, ⭐ priority org) | `trg_membership_alert` → `k1_admin_notify` |
| 2 | सदस्यता मंज़ूर / अस्वीकार | आवेदक | — | ✅ (स्वागत + सदस्य क्रमांक / कारण) | ✅ | `trg_membership_decided_notify` |
| 3 | नया संगठन पंजीकरण | platform admins | ✅ | ✅ | ✅ (`k1_org_register`) | `trg_org_registered_alert`, `k1_org_register` |
| 4 | संगठन स्वीकृत | उस संगठन के admins | — | ✅ (site URL + अगले कदम: settings, SMTP/WhatsApp, homepage, team) | ✅ | `trg_org_decided_notify` |
| 5 | भूमिका मिली (role) | वह व्यक्ति | — | ✅ (+ org admin हो और channel न हो तो SMTP/WhatsApp जोड़ने की याद) | ✅ | `trg_role_assigned_notify` |
| 6 | अपना SMTP/WhatsApp नहीं (साप्ताहिक) | संस्था के admins (`org.settings.edit`) + platform admins | ✅ | ✅ | — | cron `k1-channel-reminders` (सोम 03:30 UTC) |
| 7 | संपर्क संदेश (contact form) | संस्था के admins (`community.messages.manage`) | ✅ | ✅ | ✅ | `trg_contact_alert` (WA), `trg_contact_inapp` (in-app+email) |
| 8 | शोक संदेश मंज़ूरी के लिए जमा | family admins (`shok.approve`) + village admins | ✅ | ✅ | ✅ (shokpatra `trg_notify_letter_queued`) | `trg_letter_notify_k1` |
| 9 | शोक संदेश मंज़ूर / अस्वीकार | बनाने वाला | — | ✅ | ✅ (shokpatra `decide_letter`) | `trg_letter_notify_k1` |
| 10 | वैवाहिक — किसी ने रुचि दिखाई | प्रोफ़ाइल का मालिक | — | ✅ | ✅ | `trg_matrimony_interest_notify` |
| 11 | वैवाहिक — रुचि स्वीकार | रुचि दिखाने वाला | — | ✅ | ✅ | `trg_matrimony_interest_notify` |
| 12 | समुदाय: like / टिप्पणी / जवाब / @mention / moderation | सदस्य | ✅ (feed की 🔔) | — | — | `cm_notifications` |
| 13 | नया user (shokpatra विवरण पूरा) | admin_notify_phone | — | — | ✅ | shokpatra `notify_details_done` |
| 14 | shokpatra digest (pending परिवार, सुझाव, links) | admin_notify_phone + village admins | — | — | ✅ दिन में 2 बार (09:30, 18:30 IST) | `send_admin_digest` |
| 15 | WhatsApp OTP (लॉगिन) | user | — | — | ✅ | edge `whatsapp-otp-hook` |
| 16 | Health digest (मंच) | owner | — | — | ✅ रोज़ 08:00 IST | `send_health_digest` |

**अभी नहीं (बाद में):** आयोजन पंजीयन की पुष्टि, दान रसीद (donate बंद), समुदाय का ईमेल digest, SMS (बंद ही रहेगा)।

## Owner/admin को क्या करना है
1. **मंच का SMTP** (सबकी ओर से अस्थायी ईमेल): https://kalchuri.org/admin/messaging → Add channel → provider **SMTP** → host, port (465/587), username, password (Gmail हो तो App Password), from email `info@kalchuri.org`, from name "Kalchuri One" → Default ✓ → Test।
2. **मंच का WhatsApp**: वहीं Add channel → **Vivid Relay** → relay URL, session, API key (vr_…) → Default ✓।
3. हर संस्था का admin अपनी sub-site के Admin → Messaging में वही दो channel अपने नाम से जोड़े (जब तक नहीं जोड़ता, मंच के channel से जाता है और सोमवार को याद आती है)।
