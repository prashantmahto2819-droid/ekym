# User Roles & Permissions

## तीन परतें
1. **Platform**: `core.platform_admins` में Super Admin (आप)। सब संगठन, approvals, साझा templates, विज्ञापन और integrations इन्हीं के पास।
2. **Organization**: हर संगठन के अपने roles, जो permission keys के समूह होते हैं। एक व्यक्ति कई संगठनों में अलग-अलग role रख सकता है।
3. **Department / scope**: role assignment पर `department_id` (जैसे "मीडिया विभाग") या क्षेत्र scope (shokpatra की तरह सामाजिक क्षेत्र / गाँव)।

## पहले से बने role templates (हर नए संगठन को copy मिलेंगे)

| Role | मुख्य permissions |
|---|---|
| संगठन एडमिन | `*` (उसी संगठन में सब) |
| अध्यक्ष | approvals: पत्र, प्रस्ताव, सदस्यता; सब देखना |
| सचिव | पत्र बनाना/भेजना, बैठक, कार्यवृत्त, सदस्य |
| कोषाध्यक्ष | `fin.*` (वाउचर, रसीद, रिपोर्ट), FY lock |
| संपादक | `cms.post.review`, `cms.post.publish`, `pub.*` |
| लेखक | `cms.post.create`, अपने लेख edit (draft/changes_requested में) |
| मीडिया प्रभारी | gallery, video, news, social share |
| विभाग एडमिन | सिर्फ़ सौंपे गए विभाग की permissions |
| सदस्य | अपनी प्रोफ़ाइल, परिवार, आयोजन RSVP, लेख सुझाना |
| वंश वृक्ष एडमिन | shokpatra admin अधिकार (क्षेत्र/गाँव scope के साथ) |

संगठन एडमिन अपने नए roles बना सकता है (checkbox list से)।

## Permission keys (नमूना)
```
org.settings.edit        org.member.approve       org.member.card.issue
gov.meeting.manage       gov.resolution.record    gov.election.manage
cms.page.edit            cms.post.create          cms.post.review     cms.post.publish
cms.post.nominate_central  pub.issue.publish
docs.template.edit       docs.letter.create       docs.letter.approve docs.letter.dispatch
fin.voucher.create       fin.voucher.approve      fin.voucher.cancel  fin.report.view  fin.fy.lock
events.manage            comms.campaign.send      comms.channel.manage
family.manage            shok.send                shok.approve
ads.manage               audit.view
```

## नियम
- हर RLS policy में `core.can(organization_id, '<key>')` (security definer, `search_path` fixed)।
- "Maker-checker": जो वाउचर बनाए, वही उसे approve नहीं कर सकता (वैकल्पिक, संगठन की सेटिंग)।
- "पहला फ़ैसला ही मान्य" (shokpatra नियम) हर approval पर लागू: `status = 'pending'` की जाँच के साथ atomic update।
- ऊपर के संगठन (parent) को नीचे के डेटा का सिर्फ़ पढ़ने का अधिकार, और वह भी तभी जब नीचे वाला `share_with_parent` चालू करे। हिसाब कभी साझा नहीं होगा, सिर्फ़ सारांश रिपोर्ट।
- फ़ोन/पता: आम सदस्य दूसरों का नंबर नहीं देख सकता। एडमिन सिर्फ़ अपने scope में देख सकता है। पूरा विवरण सिर्फ़ super admin देखेगा (shokpatra नियम जैसा)।

## मौजूदा roles का mapping (migration)
| अभी | Kalchuri One में |
|---|---|
| shokpatra `profiles.super_admin = true` | `core.platform_admins (super)` |
| shokpatra `role = admin`, scope all | Samaj (root) संगठन में "वंश वृक्ष एडमिन" (scope: सब) |
| shokpatra admin + admin_regions / admin_villages | वही role, उसी region/village scope के साथ (मौजूदा टेबल ही scope का स्रोत रहेंगी) |
| ekym `user_roles` SUPER_ADMIN/ADMIN | EKYM संगठन में "संगठन एडमिन" |
| ekym CONTENT_MANAGER, BLOOD_MANAGER, … | EKYM संगठन में उसी नाम के roles |
