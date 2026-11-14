// One-language admin text. Older admin screens pass labels like "सदस्य · Members", "Title (English)" or plain
// English words; `tx(label, hi)` turns any of these into the chosen language only.

const PAIRS: [string, string][] = [
  ["Title", "शीर्षक"], ["Subtitle", "उपशीर्षक"], ["Description", "विवरण"], ["Message", "संदेश"], ["Name", "नाम"], ["Full name", "पूरा नाम"],
  ["Slug", "वेब पता (slug)"], ["Status", "स्थिति"], ["Image", "चित्र"], ["Photo", "फोटो"], ["Cover image", "कवर चित्र"], ["Logo", "लोगो"],
  ["Date", "दिनांक"], ["Start", "शुरुआत"], ["End", "समाप्ति"], ["Starts", "शुरुआत"], ["Ends", "समाप्ति"], ["Start date", "शुरू होने की तारीख"], ["End date", "समाप्ति की तारीख"],
  ["Order", "क्रम"], ["Sort order", "क्रम"], ["Position", "स्थान क्रम"], ["Published", "प्रकाशित"], ["Publish", "प्रकाशित करें"], ["Active", "सक्रिय"], ["Visible", "दिखाएँ"],
  ["Link", "लिंक"], ["Link URL", "लिंक"], ["URL", "लिंक"], ["Button text", "बटन का पाठ"], ["Button link", "बटन का लिंक"],
  ["Category", "श्रेणी"], ["Body", "मुख्य पाठ"], ["Content", "सामग्री"], ["Summary", "सारांश"], ["Excerpt", "सारांश"], ["Author", "लेखक"],
  ["Location", "स्थान"], ["Venue", "स्थान"], ["Phone", "फ़ोन"], ["Email", "ईमेल"], ["Mobile", "मोबाइल"], ["WhatsApp", "व्हाट्सऐप"], ["Address", "पता"],
  ["City", "शहर"], ["Village", "गाँव"], ["District", "ज़िला"], ["State", "राज्य"], ["Pincode", "पिन कोड"], ["Country", "देश"],
  ["Amount", "राशि"], ["Notes", "टिप्पणी"], ["Note", "टिप्पणी"], ["Remarks", "टिप्पणी"], ["Type", "प्रकार"], ["Kind", "प्रकार"], ["Featured", "विशेष"], ["Pinned", "ऊपर टिका"],
  ["Question", "प्रश्न"], ["Options", "विकल्प"], ["Answer", "उत्तर"], ["Designation", "पद"], ["Role", "भूमिका"], ["About", "परिचय"], ["Bio", "परिचय"],
  ["Video URL", "वीडियो लिंक"], ["Video", "वीडियो"], ["Tags", "टैग"], ["Price", "मूल्य"], ["Year", "वर्ष"], ["Month", "माह"], ["Issue no", "अंक संख्या"],
  ["Goal", "लक्ष्य"], ["Target", "लक्ष्य"], ["Raised", "जमा राशि"], ["Created", "बनाया गया"], ["Updated", "बदला गया"], ["Created at", "बनाया गया"],
  ["Gender", "लिंग"], ["Age", "आयु"], ["Date of birth", "जन्म तिथि"], ["Blood group", "रक्त समूह"], ["Occupation", "व्यवसाय"], ["Education", "शिक्षा"],
  ["Committee", "समिति"], ["Member", "सदस्य"], ["Members", "सदस्य"], ["Organization", "संगठन"], ["Organisation", "संगठन"], ["Website", "वेबसाइट"],
  ["Question (English)", "प्रश्न (अंग्रेज़ी में)"], ["Seats", "सीटें"], ["Capacity", "क्षमता"], ["Deadline", "अंतिम तिथि"], ["Expires", "समाप्ति"], ["Expires at", "समाप्ति"],
  ["Headline", "शीर्षक"], ["Featured image URL", "मुख्य चित्र"], ["Image URL", "चित्र"], ["Author (byline)", "लेखक का नाम"], ["Publish date", "प्रकाशन तिथि"],
  ["Show on homepage", "होम पेज पर दिखाएँ"], ["Breaking", "ताज़ा खबर"], ["SEO title", "खोज इंजन के लिए शीर्षक"], ["SEO description", "खोज इंजन के लिए विवरण"],
  ["Source (if external)", "स्रोत (बाहरी हो तो)"], ["External link", "बाहरी लिंक"], ["Views", "देखा गया"], ["Full story", "पूरी खबर"], ["Excerpt", "सार"], ["Content", "मुख्य पाठ"],
  ["Text ad", "विज्ञापन पाठ"],
  ["Save", "सहेजें"], ["Saved", "सहेज लिया"], ["Saving…", "सहेज रहे हैं…"], ["Delete", "हटाएँ"], ["Deleted", "हटा दिया"], ["Edit", "बदलें"], ["New", "नया"], ["Add", "जोड़ें"],
  ["Cancel", "रद्द करें"], ["Close", "बंद करें"], ["Search", "खोजें"], ["Approve", "मंज़ूर करें"], ["Reject", "अस्वीकार करें"], ["Approved", "मंज़ूर"], ["Rejected", "अस्वीकार"],
  ["Pending", "बाकी"], ["review", "समीक्षा"], ["published", "प्रकाशित"], ["archived", "संग्रहित"], ["draft", "मसौदा"], ["new", "नया"], ["contacted", "संपर्क किया"], ["approved", "मंज़ूर"], ["rejected", "अस्वीकार"], ["pending", "बाकी"], ["submitted", "जमा"], ["shortlisted", "चयन सूची में"], ["selected", "चयनित"], ["closed", "बंद"], ["resolved", "हल हुआ"], ["active", "सक्रिय"], ["inactive", "निष्क्रिय"], ["verified", "सत्यापित"], ["fulfilled", "पूरा हुआ"], ["cancelled", "रद्द"], ["completed", "पूरा"], ["ongoing", "जारी"], ["upcoming", "आगामी"], ["Draft", "मसौदा"], ["Yes", "हाँ"], ["No", "नहीं"], ["All", "सभी"], ["Show more", "और दिखाएँ"], ["Loading…", "लोड हो रहा है…"], ["Download", "डाउनलोड"],
  ["Export", "निर्यात"], ["Import", "आयात"], ["Upload", "अपलोड"], ["Preview", "झलक"], ["Send", "भेजें"], ["Sent", "भेजा गया"], ["Failed", "विफल"], ["Actions", "कार्य"],
  ["Hidden", "छिपा"], ["Open", "खुला"], ["Closed", "बंद"], ["Paid", "भुगतान हुआ"], ["Unpaid", "भुगतान बाकी"], ["Verified", "सत्यापित"], ["Submitted", "जमा"],
  ["Mode", "माध्यम"], ["Reference", "संदर्भ"], ["Receipt", "रसीद"], ["Purpose", "उद्देश्य"], ["Total", "कुल"], ["Balance", "शेष"], ["Account", "खाता"],
  ["Program", "कार्यक्रम"], ["Programme", "कार्यक्रम"], ["Event", "आयोजन"], ["Events", "आयोजन"], ["News", "समाचार"], ["Blog", "लेख"], ["Articles", "लेख"], ["Magazine", "पत्रिका"],
  ["Comments", "टिप्पणियाँ"], ["Achievements", "उपलब्धियाँ"], ["Thoughts", "विचार"], ["Announcements", "सूचनाएँ"], ["Campaigns", "अभियान"], ["Library", "पुस्तकालय"],
  ["Books", "पुस्तकें"], ["Ads", "विज्ञापन"], ["Advertisements", "विज्ञापन"], ["Polls", "मतदान"], ["Jobs", "रोज़गार"], ["Scholarships", "छात्रवृत्ति"], ["Volunteers", "स्वयंसेवक"],
  // Nov 2026: labels found on the remaining admin screens
  ["Abstained", "तटस्थ"], ["Access", "पहुँच"], ["Admin note", "एडमिन टिप्पणी"], ["Agenda item", "एजेंडा बिंदु"], ["Agenda", "एजेंडा"], ["Agreed price (₹)", "तय मूल्य (₹)"], ["Album", "एल्बम"], ["Album title", "एल्बम का नाम"],
  ["Allow multiple choices", "एक से ज़्यादा विकल्प चुनने दें"], ["Allow public registration on the event page", "आयोजन पेज पर सबको पंजीयन करने दें"], ["Anonymous (hide who voted)", "गुप्त (किसने वोट दिया, न दिखे)"],
  ["Applied", "आवेदन तिथि"], ["Appointed by", "नियुक्त किया"], ["Assignee", "ज़िम्मेदार"], ["Assignee (name)", "ज़िम्मेदार (नाम)"], ["Audience", "किसके लिए"], ["Auto-generated if empty", "खाली छोड़ें तो अपने-आप बनेगा"],
  ["Availability", "उपलब्धता"], ["Available", "उपलब्ध"], ["Available copies", "उपलब्ध प्रतियाँ"], ["Banner image", "बैनर चित्र"], ["Banner image URL (e.g. 970×250 or 300×250)", "बैनर चित्र (जैसे 970×250 या 300×250)"], ["Beneficiary", "लाभार्थी"],
  ["Button link (e.g. /join)", "बटन का लिंक (जैसे /join)"], ["Campaign", "अभियान"], ["Campaign name", "अभियान का नाम"], ["Capacity (seats, optional)", "क्षमता (सीटें, वैकल्पिक)"], ["Channel", "माध्यम"], ["Class / level", "कक्षा / स्तर"],
  ["Click-through link", "क्लिक करने पर लिंक"], ["College", "कॉलेज"], ["Contact phone", "संपर्क फ़ोन"], ["Contribution date", "सहयोग की तारीख"], ["Contribution type", "सहयोग का प्रकार"], ["Coordinator", "संयोजक"], ["Course", "कोर्स"],
  ["Cover image URL", "कवर चित्र"], ["Date & time", "दिनांक व समय"], ["Date received", "मिलने की तारीख"], ["Date sent", "भेजने की तारीख"], ["Dates", "तिथियाँ"], ["Department", "विभाग"], ["Department / mentor", "विभाग / मार्गदर्शक"],
  ["Details", "विवरण"], ["Display order", "दिखाने का क्रम"], ["Due", "अंतिम तिथि"], ["Due date", "अंतिम तिथि"], ["Duration", "अवधि"], ["Edition", "संस्करण"], ["Eligibility", "पात्रता"], ["Emergency", "आपात में उपलब्ध"],
  ["Ends at", "समाप्ति"], ["Event date", "आयोजन की तारीख"], ["Father's name", "पिता का नाम"], ["Fee (₹, 0 = free)", "शुल्क (₹, 0 = निःशुल्क)"], ["Festival", "त्योहार"], ["Files", "फ़ाइलें"], ["For", "किसके लिए"], ["From", "से"],
  ["From email", "भेजने वाला ईमेल"], ["From meeting", "किस बैठक से"], ["From name", "भेजने वाले का नाम"], ["Full description", "पूरा विवरण"], ["Full text", "पूरा पाठ"], ["Group", "समूह"], ["Hospital", "अस्पताल"], ["ISBN", "ISBN"],
  ["Icon key", "आइकन"], ["Interests", "रुचियाँ"], ["Internship", "इंटर्नशिप"], ["Invitation design", "निमंत्रण डिज़ाइन"], ["Issue", "अंक"], ["Issue no. (e.g. Vol 2 · No 3)", "अंक संख्या (जैसे वर्ष 2 · अंक 3)"], ["Item", "वस्तु"],
  ["Lang", "भाषा"], ["Language", "भाषा"], ["Last donation", "पिछला रक्तदान"], ["Leave empty to assign automatically on approval", "खाली छोड़ें — मंज़ूरी पर अपने-आप मिलेगा"], ["Link (Drive / PDF URL)", "लिंक (Drive / PDF)"], ["Linked member", "जुड़ा सदस्य"],
  ["Map link", "नक्शे का लिंक"], ["Meeting", "बैठक"], ["Member no.", "सदस्य क्रमांक"], ["Membership card", "सदस्यता कार्ड"], ["Meta approved template name (Cloud API only)", "Meta से मंज़ूर टेम्पलेट का नाम (सिर्फ़ Cloud API)"], ["Minutes", "कार्यवृत्त"],
  ["Needed by", "कब तक चाहिए"], ["No.", "क्रमांक"], ["Notice text (sent to members)", "सूचना का पाठ (सदस्यों को जाएगा)"], ["Online link", "ऑनलाइन लिंक"], ["Organizer / committee", "आयोजक / समिति"], ["Our ref", "हमारा संदर्भ"],
  ["Our reference no.", "हमारा संदर्भ क्रमांक"], ["Outcome", "परिणाम"], ["Outcome / decision", "परिणाम / निर्णय"], ["Output", "परिणाम"], ["Patient", "मरीज़"], ["Phone number ID", "फ़ोन नंबर ID"], ["Photo URL", "फोटो"], ["Pin to top", "ऊपर टिकाएँ"],
  ["Platform", "प्लेटफ़ॉर्म"], ["Port", "पोर्ट"], ["Presenter", "प्रस्तुतकर्ता"], ["Priority", "प्राथमिकता"], ["Proposed by", "प्रस्तावक"], ["Public", "सार्वजनिक"], ["Public registration", "सार्वजनिक पंजीयन"], ["Publish at", "प्रकाशन का समय"],
  ["Publisher", "प्रकाशक"], ["Raised amount", "जुटाई राशि"], ["Rank (1 = top)", "क्रम (1 = सबसे ऊपर)"], ["Received", "प्राप्त"], ["Recognition message", "सम्मान संदेश"], ["Reel URL", "रील लिंक"], ["Ref", "संदर्भ"], ["Relay URL", "Relay पता"],
  ["Requester", "अनुरोधकर्ता"], ["Research topic", "शोध विषय"], ["Resolution", "प्रस्ताव"], ["Result", "परिणाम"], ["SMTP host", "SMTP सर्वर"], ["Scanned copy link", "स्कैन प्रति का लिंक"], ["Seconded by", "समर्थक"], ["Section key", "भाग की पहचान"],
  ["Session name", "सत्र का नाम"], ["Shelf", "अलमारी / रैक"], ["Short description", "छोटा विवरण"], ["Show email publicly", "ईमेल सबको दिखाएँ"], ["Show from", "कब से दिखाएँ"], ["Show on public Team page", "टीम पेज पर दिखाएँ"],
  ["Show on website", "वेबसाइट पर दिखाएँ"], ["Show phone publicly", "फ़ोन सबको दिखाएँ"], ["Show publicly", "सबको दिखाएँ"], ["Show results while open", "मतदान चलते हुए परिणाम दिखाएँ"], ["Show until", "कब तक दिखाएँ"], ["Slip", "पर्ची"],
  ["Sponsor", "प्रायोजक"], ["Sponsor email", "प्रायोजक ईमेल"], ["Sponsor phone", "प्रायोजक फ़ोन"], ["Subject", "विषय"], ["Subject (email only)", "विषय (सिर्फ़ ईमेल)"], ["Target amount", "लक्ष्य राशि"], ["Task", "काम"], ["Tenure from", "कार्यकाल से"],
  ["Tenure to", "कार्यकाल तक"], ["Their ref", "उनका संदर्भ"], ["Their reference no.", "उनका संदर्भ क्रमांक"], ["Theme", "थीम"], ["Thumbnail URL", "छोटा चित्र"], ["To", "को"], ["Total copies", "कुल प्रतियाँ"], ["Units", "यूनिट"], ["Urgency", "स्थिति"],
  ["Username", "यूज़रनेम"], ["Valid till", "कब तक मान्य"], ["Views / clicks", "देखे / क्लिक"], ["Village / City", "गाँव / शहर"], ["Visibility", "कौन देखे"], ["Votes / results", "मत / परिणाम"], ["Votes against", "विरोध में मत"], ["Votes for", "पक्ष में मत"],
  ["Weight 1–10 (share of rotation)", "भार 1–10 (कितनी बार दिखे)"], ["WhatsApp Business Account ID", "WhatsApp Business खाता ID"], ["When", "कब"], ["Who can vote", "कौन वोट दे सकता है"], ["auto", "अपने-आप"], ["auto from name", "नाम से अपने-आप"],
  ["auto from title", "शीर्षक से अपने-आप"], ["e.g. blood, food, books", "जैसे रक्त, भोजन, पुस्तकें"], ["e.g. hero, news, network", "जैसे hero, news, network"], ["lowercase-with-dashes", "छोटे-अक्षर-और-डैश"], ["Short description (English)", "छोटा विवरण (अंग्रेज़ी में)"],
  ["Donor", "दाता"], ["Donation ID", "दान क्रमांक"], ["Mobile number", "मोबाइल नंबर"], ["Payment", "भुगतान"], ["Paid on", "भुगतान तिथि"], ["Method", "माध्यम"], ["Gateway", "गेटवे"],
  ["CREATED", "शुरू हुआ"], ["PAID", "भुगतान हुआ"], ["FAILED", "विफल"], ["CANCELLED", "रद्द"], ["REFUNDED", "वापस किया"], ["PENDING", "बाकी"], ["VERIFIED", "सत्यापित"], ["REJECTED", "अस्वीकार"], ["NEW", "नया"], ["SUBMITTED", "जमा"],
  ["FULFILLED", "पूरा हुआ"], ["CLOSED", "बंद"], ["ALL", "सभी"], ["Yes", "हाँ"], ["No", "नहीं"],
  ["Gallery albums", "गैलरी एल्बम"], ["Reels", "रील"], ["Videos", "वीडियो"], ["Committees", "समितियाँ"], ["President", "अध्यक्ष"], ["Vice President", "उपाध्यक्ष"], ["Secretary", "सचिव"], ["Joint Secretary", "सह सचिव"],
  ["Organising Secretary", "संगठन सचिव"], ["Treasurer", "कोषाध्यक्ष"], ["Spokesperson", "प्रवक्ता"], ["Executive Member", "कार्यकारिणी सदस्य"], ["Advisor", "सलाहकार"], ["Patron", "संरक्षक"],
  ["Blood requirements", "रक्त की ज़रूरतें"], ["Donor registry", "रक्तदाता सूची"], ["Verify requests before they appear publicly.", "अनुरोध सबको दिखने से पहले जाँचिए।"], ["Volunteer applications", "स्वयंसेवक आवेदन"],
  ["Categories", "श्रेणियाँ"], ["Magazine issues", "पत्रिका के अंक"], ["Declined", "अस्वीकार"], ["Uploaded", "अपलोड हुआ"], ["Contributors", "सहयोगी"], ["Listings", "सूचियाँ"], ["Matrimony", "वैवाहिक"],
  ["Only approved and active testimonials appear publicly.", "सिर्फ़ मंज़ूर और सक्रिय अनुभव सबको दिखते हैं।"], ["Remove", "हटाएँ"], ["Allow", "अनुमति दें"], ["Tasks", "काम"], ["Meetings", "बैठकें"], ["Documents", "दस्तावेज़"],
  ["AI confidence needed (0–1)", "AI का भरोसा कितना हो (0–1)"], ["Accept online donations", "ऑनलाइन दान लें"], ["Allow (full reach)", "अनुमति (पूरी पहुँच)"], ["Apply these options to the newest poll", "ये विकल्प सबसे नए मतदान में लगाएँ"],
  ["Attendance", "उपस्थिति"], ["Backups", "बैकअप"], ["Community", "समुदाय"], ["Cover", "कवर"], ["Cron job", "समय-सारिणी काम"], ["Decline", "अस्वीकार करें"], ["Dismiss", "हटाएँ"], ["Donations", "दान"], ["English", "अंग्रेज़ी"],
  ["Enter at least two options", "कम से कम दो विकल्प लिखिए"], ["Expire", "समाप्त करें"], ["Export downloaded", "निर्यात डाउनलोड हुआ"], ["Hidden posts", "छिपी पोस्ट"], ["Hide post", "पोस्ट छिपाएँ"],
  ["Keyword score to flag (phone number = 2, % off = 2, each keyword = 1)", "रोकने का अंक (फ़ोन नंबर = 2, % छूट = 2, हर शब्द = 1)"], ["Keywords (comma separated; empty = built-in Hindi + English list)", "शब्द (कॉमा से अलग; खाली = पहले से बनी हिंदी + अंग्रेज़ी सूची)"],
  ["Last run", "पिछली बार चला"], ["Letters & documents", "पत्र व दस्तावेज़"], ["Live health is visible to platform admins only.", "लाइव स्थिति सिर्फ़ प्लेटफ़ॉर्म एडमिन को दिखती है।"], ["Loading template…", "टेम्पलेट खुल रहा है…"],
  ["Meeting not found.", "बैठक नहीं मिली।"], ["Modules on this site", "इस साइट पर कौन-से हिस्से चालू हों"], ["No active member has a WhatsApp number", "किसी सक्रिय सदस्य का WhatsApp नंबर नहीं है"], ["No comments yet.", "अभी कोई टिप्पणी नहीं।"],
  ["No documents yet.", "अभी कोई दस्तावेज़ नहीं।"], ["No pages yet. Type a title above to start.", "अभी कोई पेज नहीं। ऊपर शीर्षक लिखकर शुरू कीजिए।"], ["No profiles yet.", "अभी कोई प्रोफ़ाइल नहीं।"], ["None.", "कुछ नहीं।"], ["Nothing here.", "यहाँ कुछ नहीं।"],
  ["Nothing nominated right now.", "अभी कुछ नामित नहीं।"], ["Office bearers of", "पदाधिकारी —"], ["One name per line. Write \"(absent)\" after a name to mark absence.", "हर पंक्ति में एक नाम। अनुपस्थित हो तो नाम के बाद \"(absent)\" लिखें।"],
  ["Organization settings", "संगठन सेटिंग"], ["Pages", "पेज"], ["Payment settings", "भुगतान सेटिंग"], ["Payment settings saved", "भुगतान सेटिंग सहेज ली"], ["Promotion filter settings", "प्रचार रोकने की सेटिंग"], ["Publishing", "प्रकाशन"],
  ["Restore", "वापस लाएँ"], ["Save modules", "हिस्से सहेजें"], ["Saved — reload to see the menu change", "सहेज लिया — मेन्यू बदलाव देखने के लिए पेज दोबारा खोलें"], ["Schedule (UTC)", "समय-सारिणी (UTC)"],
  ["Select a committee above to add its office bearers.", "पदाधिकारी जोड़ने के लिए ऊपर समिति चुनें।"], ["Settings saved", "सेटिंग सहेज ली"], ["Spam", "स्पैम"], ["System health & backups", "सिस्टम की स्थिति व बैकअप"],
  ["Template not found.", "टेम्पलेट नहीं मिला।"], ["Template saved", "टेम्पलेट सहेज लिया"], ["This organization's data", "इस संगठन का डेटा"], ["Title / To", "शीर्षक / किसे"],
  ["Could not save", "सहेजा नहीं जा सका"], ["Save settings", "सेटिंग सहेजें"], ["Settings row not found", "सेटिंग नहीं मिली"], ["Could not open the receipt", "रसीद नहीं खुली"], ["Could not create that document", "दस्तावेज़ नहीं बना"],
  ["Added to the central feed", "मुख्य फ़ीड में जोड़ दिया"], ["Reason (sent to the submitter)", "कारण (भेजने वाले को जाएगा)"], ["Kalchuri One feed", "कलचुरी वन फ़ीड"], ["Tasks from this meeting", "इस बैठक के काम"], ["WhatsApp notice to members", "सदस्यों को WhatsApp सूचना"],
  ["Each resolution gets a serial number automatically.", "हर प्रस्ताव को क्रमांक अपने-आप मिलता है।"], ["Internship fee", "इंटर्नशिप शुल्क"], ["Maximum donation", "अधिकतम दान"], ["Minimum donation", "न्यूनतम दान"], ["Receipt footer note", "रसीद के नीचे का संदेश"],
  ["Receipt number prefix", "रसीद क्रमांक की शुरुआत"], ["Suggested amounts", "सुझाई गई राशियाँ"], ["Volunteer registration fee", "स्वयंसेवक पंजीयन शुल्क"], ["Comma separated", "कॉमा से अलग"], ["Pending approvals", "मंज़ूरी बाकी"], ["Shok sandesh", "शोक संदेश"],
  ["Messaging queue (WhatsApp / email)", "संदेश कतार (WhatsApp / ईमेल)"], ["Kalchuri One moderation", "कलचुरी वन मॉडरेशन"], ["Certificate (English)", "प्रमाण-पत्र (अंग्रेज़ी में)"], ["ID card (English)", "पहचान पत्र (अंग्रेज़ी में)"],
  ["Approve donors and keep availability up to date.", "रक्तदाताओं को मंज़ूर करें और उनकी उपलब्धता अपडेट रखें।"], ["Review and approve people who want to join the seva team. Photos can be replaced here before issuing an ID card.", "सेवा टीम से जुड़ना चाहने वालों को जाँचकर मंज़ूर करें। पहचान पत्र बनाने से पहले यहाँ फोटो बदली जा सकती है।"],
  ["Donors, partners and well-wishers recognised on the site.", "दानदाता, सहयोगी और शुभचिंतक जिन्हें साइट पर सम्मान दिया जाता है।"], ["Testimonials", "अनुभव"], ["Shown as filters on the blog and news pages.", "ब्लॉग और समाचार पेज पर फ़िल्टर की तरह दिखती हैं।"],
  ["Organization name", "संगठन का नाम"], ["Tagline", "टैगलाइन"], ["Logo (square works best)", "लोगो (चौकोर सबसे अच्छा)"], ["Favicon URL", "फ़ेविकॉन (ब्राउज़र टैब का चिह्न)"], ["About us — full page text", "हमारे बारे में — पूरा पाठ"],
  ["Short about text", "संक्षिप्त परिचय"], ["Donation call-to-action text", "दान अपील"], ["Footer text", "फ़ुटर का पाठ"], ["0 means free", "0 = निःशुल्क"], ["X (Twitter)", "X (ट्विटर)"],
  ["These details power the header, footer and contact pages across the website.", "ये जानकारी पूरी वेबसाइट के ऊपरी हिस्से, फ़ुटर और संपर्क पेज पर दिखती है।"],
];
const EN2HI = new Map(PAIRS.map(([e, h]) => [e.toLowerCase(), h]));
const HI2EN = new Map(PAIRS.map(([e, h]) => [h, e]));
HI2EN.set("सार", "Summary"); HI2EN.set("लेख", "Article"); HI2EN.set("पूरी खबर", "Full story"); HI2EN.set("विज्ञापन पाठ", "Ad text"); HI2EN.set("शीर्षक", "Title"); HI2EN.set("नाम", "Name"); HI2EN.set("स्थान", "Place"); HI2EN.set("टिप्पणी", "Notes"); HI2EN.set("सदस्य", "Members"); HI2EN.set("प्रकार", "Type");

const DEV = /[ऀ-ॿ]/;
const LAT = /[A-Za-z]{2,}/;

function word(s: string, hi: boolean): string {
  const t = s.trim();
  if (hi) return EN2HI.get(t.toLowerCase()) ?? t;
  return HI2EN.get(t) ?? t;
}

/** Shows a label in one language. */
export function tx(label: string | null | undefined, hi: boolean): string {
  if (!label) return "";
  const s = String(label);
  // "हिंदी · English" / "English · हिंदी" / "हिंदी / English"
  for (const sep of [" · ", " / ", " — "]) {
    if (!s.includes(sep)) continue;
    const parts = s.split(sep);
    if (parts.length === 2) {
      const [a, b] = parts as [string, string];
      const aDev = DEV.test(a) && !LAT.test(a.replace(/\([^)]*\)/g, "")), bDev = DEV.test(b) && !LAT.test(b.replace(/\([^)]*\)/g, ""));
      const aLat = !DEV.test(a) && LAT.test(a), bLat = !DEV.test(b) && LAT.test(b);
      if (aDev && bLat) return tx(hi ? a.trim() : b.trim(), hi);
      if (aLat && bDev) return tx(hi ? b.trim() : a.trim(), hi);
    }
  }
  // "Title (English)" ↔ "शीर्षक (हिंदी)" — labels that say which language to type in
  const m = /^(.*?)\s*\((English|अंग्रेज़ी|हिंदी|Hindi)\)\s*$/.exec(s);
  if (m) {
    const base = m[1]!, lang = m[2]!;
    const isHiField = lang === "हिंदी" || lang === "Hindi";
    return hi ? `${word(base, true)} (${isHiField ? "हिंदी में" : "अंग्रेज़ी में"})` : `${word(base, false)} (${isHiField ? "Hindi" : "English"})`;
  }
  return word(s, hi);
}
