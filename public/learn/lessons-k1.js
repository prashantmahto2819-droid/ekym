// Kalchuri One tutorial lessons (route /tutorial). Format: see the top of player.js.
// Every text is { hi, en } — B(hi, en). Screens are drawn samples with made-up names; keep labels in step with the real pages.
const B = (hi, en) => ({ hi, en });

export const LESSONS = [
  {
    title: B("शुरुआत", "Getting started"),
    intro: B("पहले लॉगिन, फिर सदस्यता का फ़ॉर्म। संस्था के एडमिन की मंज़ूरी के बाद सदस्य की सारी सुविधाएँ खुल जाती हैं।", "Sign in first, then fill the membership form. Once your organization's admin approves it, all member features open."),
    lessons: [
      {
        id: "login", title: B("लॉगिन (WhatsApp OTP)", "Sign in (WhatsApp OTP)"), url: "kalchuri.org/auth",
        intro: B("पासवर्ड की ज़रूरत नहीं; कोड आपके WhatsApp पर आता है।", "No password needed; the code arrives on your WhatsApp."),
        screen: [
          ["top", B("लॉगिन", "Sign in")],
          ["tabs", [B("मोबाइल", "Mobile"), B("ईमेल", "Email")], 0],
          ["f", "ph", B("मोबाइल नंबर", "Mobile number"), ""],
          ["b", "send", B("कोड भेजें", "Send code")],
          ["f", "?code", B("WhatsApp पर आया कोड", "Code received on WhatsApp"), ""],
          ["b", "?go", B("लॉगिन करें", "Sign in")],
          ["ok", "?done", B("लॉगिन हो गया।", "You are signed in.")],
        ],
        steps: [
          { s: B("साइट के ऊपर «Login» दबाइए और अपना मोबाइल नंबर लिखिए।", "Press “Login” at the top of the site and type your mobile number."), to: "ph", type: "98XXXXXX10" },
          { s: B("«कोड भेजें» दबाइए।", "Press “Send code”."), to: "send", click: true, hide: ["send"], show: ["code", "go"] },
          { s: B("WhatsApp पर आया कोड यहाँ लिखिए। कोड किसी को मत बताइए।", "Type the code from WhatsApp. Never share it with anyone."), to: "code", type: "4 8 2 9 1 5" },
          { s: B("«लॉगिन करें» दबाइए।", "Press “Sign in”."), to: "go", click: true, show: ["done"] },
        ],
        tip: B("भाषा ऊपर EN / हिं बटन से बदलती है।", "Change the language with the EN / हिं button at the top."),
      },
      {
        id: "join", title: B("सदस्य बनना", "Becoming a member"), url: "kalchuri.org/join",
        intro: B("सदस्यता उसी संस्था की साइट पर भरिए जिससे आप जुड़ना चाहते हैं।", "Fill the form on the site of the organization you want to join."),
        screen: [
          ["h", B("सदस्यता", "Membership")],
          ["row", [["f", "nm", B("पूरा नाम (English)", "Full name (English)"), ""], ["f", "fa", B("पिता का नाम", "Father's name"), ""]]],
          ["row", [["f", "mo", B("मोबाइल (WhatsApp)", "Mobile (WhatsApp)"), ""], ["f", "vi", B("गाँव", "Village"), ""]]],
          ["row", [["chip", "t1", B("साधारण", "General")], ["chip", "t2", B("आजीवन", "Life")], ["chip", "t3", B("संरक्षक", "Patron")]]],
          ["check", "ok", B("मैं गोपनीयता नीति और शर्तों से सहमत हूँ", "I agree to the privacy policy and terms")],
          ["b", "go", B("सदस्य बनें", "Become a member")],
          ["ok", "?done", B("आवेदन मिल गया। मंज़ूरी होते ही WhatsApp पर सूचना और डिजिटल पहचान पत्र मिलेगा।", "Application received. On approval you get a WhatsApp notice and your digital ID card.")],
        ],
        steps: [
          { s: B("अपना नाम और पिता का नाम लिखिए।", "Type your name and your father's name."), to: "nm", type: "Ramesh Kumar Jaiswal" },
          { s: B("WhatsApp वाला मोबाइल नंबर लिखिए।", "Type your WhatsApp mobile number."), to: "mo", type: "98XXXXXX10" },
          { s: B("गाँव, ज़िला और पता भरिए; ज़िला चुनने पर विधानसभा की सूची आ जाती है।", "Fill village, district and address; choosing a district brings up the assembly list."), to: "vi", type: "Dipka" },
          { s: B("सदस्यता का प्रकार चुनिए।", "Choose the membership type."), to: "t1", click: true, on: ["t1"] },
          { s: B("सहमति पर निशान लगाइए।", "Tick the consent box."), to: "ok", click: true, on: ["ok"] },
          { s: B("«सदस्य बनें» दबाइए।", "Press “Become a member”."), to: "go", click: true, show: ["done"] },
        ],
      },
    ],
  },
  {
    title: B("वंश वृक्ष और शोक संदेश", "Family tree and condolence letters"),
    intro: B("हर संस्था का अपना वंश वृक्ष होता है। यह हिस्सा आपकी संस्था की साइट पर /shok में है।", "Each organization has its own family trees. This section lives at /shok on your organization's site."),
    lessons: [
      {
        id: "tree", title: B("अपना वंश वृक्ष बनाना", "Building your family tree"), url: "kalchuri.org/shok",
        intro: B("वृक्ष पिता से पुत्रों की ओर बनता है; मुखिया वह है जिनसे संपर्क किया जाए।", "The tree runs from father to sons; the head is the person to be contacted."),
        screen: [
          ["top", B("मेरे परिवार", "My families")],
          ["node", "head", B("रमेश कुमार", "Ramesh Kumar"), B("दीपका", "Dipka"), B("मुखिया", "Head"), 0],
          ["row", [["b", "son", B("+ पुत्र", "+ Son"), "ghost"], ["b", "wife", B("+ पत्नी", "+ Wife"), "ghost"], ["b", "dau", B("+ पुत्री", "+ Daughter"), "ghost"]]],
          ["f", "?nm", B("नाम", "Name"), ""],
          ["b", "?save", B("सहेजें", "Save")],
          ["node", "?w1", B("सुनीता देवी", "Sunita Devi"), "", B("पत्नी", "Wife"), 1],
          ["node", "?s1", B("अमित कुमार", "Amit Kumar"), "", "1", 1],
          ["ok", "?done", B("वृक्ष पूरा हो जाए तो मंज़ूरी के लिए भेजिए; मंज़ूरी के बाद वह संस्था के सदस्यों को दिखता है (मोबाइल नंबर छोड़कर)।", "When the tree is complete, submit it for approval; after approval members of the organization can see it (never the phone numbers).")],
        ],
        steps: [
          { s: B("«मेरे परिवार» में अपना परिवार खोलिए। मुखिया के नीचे «+ पुत्र» दबाइए।", "Open your family under “My families”. Under the head, press “+ Son”."), to: "son", click: true, show: ["nm", "save"] },
          { s: B("नाम लिखिए; मोबाइल नंबर हो तो वह भी।", "Type the name, and the mobile number if there is one."), to: "nm", type: B("अमित कुमार", "Amit Kumar") },
          { s: B("«सहेजें» दबाइए — पुत्र पिता के नीचे जुड़ गया।", "Press “Save” — the son now hangs under his father."), to: "save", click: true, hide: ["nm", "save"], show: ["s1"] },
          { s: B("इसी तरह «+ पत्नी» और «+ पुत्री» से बाकी नाम जोड़िए।", "Add the others the same way with “+ Wife” and “+ Daughter”."), to: "wife", click: true, show: ["w1"] },
          { s: B("अंत में वृक्ष मंज़ूरी के लिए भेजिए।", "Finally, submit the tree for approval."), to: "head", on: ["head"], show: ["done"] },
        ],
        tip: B("जन्म तिथि निजी रहती है; दूसरों को सिर्फ़ उम्र दिखती है। छपे चार्ट और साझा कड़ी में नंबर कभी नहीं आते।", "Date of birth stays private; others see only the age. Printed charts and shared links never contain phone numbers."),
      },
      {
        id: "tribute", title: B("श्रद्धांजलि पेज", "Tribute page"), url: "kalchuri.org/shok/tributes",
        intro: B("दिवंगत की याद में एक पेज, जिसकी कड़ी आप खुद साझा करते हैं।", "A page in memory of the departed; you share its link yourself."),
        screen: [
          ["top", B("श्रद्धांजलि पेज", "Tribute pages")],
          ["b", "new", B("नया पेज", "New page")],
          ["f", "?nm", B("दिवंगत का नाम", "Name of the departed"), ""],
          ["f", "?ab", B("उनके बारे में", "About them"), ""],
          ["b", "?save", B("सहेजें", "Save")],
          ["card", "?pg", B("स्व. शिवप्रसाद जायसवाल", "Late Shivprasad Jaiswal"), B("पेज बन गया · लिंक कॉपी करें", "Page created · Copy link")],
          ["card", "?msg", B("नया संदेश — मोहन, मनगांव", "New message — Mohan, Mangaon"), B("मंज़ूर करें / छिपाएँ", "Approve / Hide")],
        ],
        steps: [
          { s: B("«नया पेज» दबाइए।", "Press “New page”."), to: "new", click: true, hide: ["new"], show: ["nm", "ab", "save"] },
          { s: B("नाम लिखिए; फोटो और तिथियाँ भी जोड़ सकते हैं।", "Type the name; you can add a photo and dates too."), to: "nm", type: B("स्व. शिवप्रसाद जायसवाल", "Late Shivprasad Jaiswal") },
          { s: B("कुछ पंक्तियाँ उनके बारे में लिखिए।", "Write a few lines about them."), to: "ab", type: B("सरल स्वभाव, समाज सेवा में अग्रणी", "Gentle by nature, always first in community service") },
          { s: B("«सहेजें» दबाइए और «लिंक कॉपी करें» से कड़ी साझा कीजिए।", "Press “Save”, then share the link with “Copy link”."), to: "save", click: true, hide: ["nm", "ab", "save"], show: ["pg"] },
          { s: B("बिना लॉगिन लिखा गया संदेश आपकी मंज़ूरी के बाद ही पेज पर दिखता है।", "A message written without signing in appears only after you approve it."), to: "msg", show: ["msg"], on: ["msg"] },
        ],
      },
    ],
  },
  {
    title: B("वैवाहिक और चौपाल", "Matrimony and community"),
    intro: B("वैवाहिक परिचय और चौपाल पूरे मंच पर साझा हैं — हर संस्था के सदस्य इन्हें एक ही जगह देखते हैं।", "Matrimony and the community feed are shared across the platform — members of every organization see them in one place."),
    lessons: [
      {
        id: "matrimony", title: B("वैवाहिक परिचय बनाना और रुचि भेजना", "Creating a matrimony profile and sending interest"), url: "kalchuri.org/matrimony",
        intro: B("मोबाइल नंबर तभी खुलता है जब दोनों पक्ष «हाँ» कहें।", "A phone number is revealed only after both sides say yes."),
        screen: [
          ["tabs", [B("कुंवारे / कुंवारी", "Never married"), B("पुनर्विवाह", "Remarriage")], 0],
          ["b", "new", B("नया प्रोफ़ाइल", "New profile")],
          ["f", "?nm", B("नाम", "Name"), ""],
          ["row", [["chip", "?ts1", B("वंश वृक्ष: बंद", "Family tree: off")], ["chip", "?ts2", B("पूछने पर", "On request")], ["chip", "?ts3", B("खुला", "Open")]]],
          ["b", "?save", B("सहेजें", "Save")],
          ["card", "?p1", B("पूजा · 26 वर्ष · बिलासपुर", "Pooja · 26 yrs · Bilaspur"), B("प्रगतिशील समाज · गोत्र: कश्यप", "Pragatishil Samaj · Gotra: Kashyap")],
          ["row", [["b", "?int", B("रुचि भेजें", "Send interest")], ["b", "?sl", B("पसंद", "Shortlist"), "ghost"], ["b", "?tr", B("वंश वृक्ष माँगें", "Ask for family tree"), "ghost"]]],
          ["ok", "?done", B("रुचि भेज दी गई। सामने वाले के स्वीकार करने पर ही दोनों को संपर्क दिखेगा।", "Interest sent. Contacts are shown to both only after the other side accepts.")],
        ],
        steps: [
          { s: B("«नया प्रोफ़ाइल» दबाइए।", "Press “New profile”."), to: "new", click: true, hide: ["new"], show: ["nm", "ts1", "ts2", "ts3", "save"] },
          { s: B("नाम, जन्म तिथि, शिक्षा, गोत्र और वैवाहिक स्थिति भरिए।", "Fill name, date of birth, education, gotra and marital status."), to: "nm", type: B("अमित कुमार", "Amit Kumar") },
          { s: B("चुनिए कि आपका वंश वृक्ष देखने वालों को कैसे दिखे — बंद, पूछने पर, या खुला।", "Choose how viewers may see your family tree — off, on request, or open."), to: "ts2", click: true, on: ["ts2"] },
          { s: B("«सहेजें» दबाइए। आपकी संस्था के एडमिन की जाँच के बाद परिचय सबको दिखता है।", "Press “Save”. The profile is shown to everyone after your organization's admin verifies it."), to: "save", click: true, hide: ["nm", "ts1", "ts2", "ts3", "save"], show: ["p1", "int", "sl", "tr"] },
          { s: B("किसी का परिचय पसंद आए तो «रुचि भेजें» दबाइए; बाद के लिए «पसंद» में रख सकते हैं।", "If you like a profile, press “Send interest”; or keep it for later with “Shortlist”."), to: "int", click: true, on: ["int"], show: ["done"] },
          { s: B("«वंश वृक्ष माँगें» से उनके परिवार का वृक्ष देखने का अनुरोध भेज सकते हैं।", "With “Ask for family tree” you can request to see their family's tree."), to: "tr", click: true, on: ["tr"] },
        ],
        tip: B("कोई परिचय गलत या अनुचित लगे तो उसकी शिकायत (Report) कीजिए; एडमिन जाँचते हैं।", "Report a profile that looks false or inappropriate; admins review it."),
      },
      {
        id: "post", title: B("चौपाल में पोस्ट करना", "Posting on the community feed"), url: "kalchuri.org/community",
        intro: B("पोस्ट किसे दिखे, यह आप तय करते हैं।", "You decide who sees each post."),
        screen: [
          ["top", B("चौपाल", "Community")],
          ["f", "tx", B("कुछ लिखिए…", "Write something…"), ""],
          ["row", [["chip", "a1", B("सार्वजनिक", "Public")], ["chip", "a2", B("समुदाय के सदस्य", "Community members")], ["chip", "a3", B("सिर्फ़ मित्र", "Friends only")]]],
          ["b", "go", B("पोस्ट करें", "Post")],
          ["card", "?p", B("रमेश कुमार · अभी", "Ramesh Kumar · just now"), B("वार्षिक सम्मेलन की तैयारी बैठक रविवार को होगी।", "The planning meeting for the annual meet is on Sunday.")],
        ],
        steps: [
          { s: B("ऊपर के खाने में अपनी बात लिखिए; फोटो या वीडियो की कड़ी भी जोड़ सकते हैं।", "Write in the box at the top; you can add photos or a video link."), to: "tx", type: B("वार्षिक सम्मेलन की तैयारी बैठक रविवार को होगी।", "The planning meeting for the annual meet is on Sunday.") },
          { s: B("चुनिए कि पोस्ट किसे दिखे।", "Choose who can see the post."), to: "a2", click: true, on: ["a2"] },
          { s: B("«पोस्ट करें» दबाइए। विज्ञापन या चुनावी प्रचार वाली पोस्ट एडमिन की मंज़ूरी तक सीमित रहती है।", "Press “Post”. Promotional or political posts stay limited until an admin allows them."), to: "go", click: true, show: ["p"] },
        ],
      },
    ],
  },
  {
    title: B("एडमिन के काम", "For admins"),
    intro: B("यह हिस्सा सिर्फ़ उन्हें दिखता है जिन्हें संस्था ने भूमिका दी है।", "This part is visible only to people the organization has given a role."),
    lessons: [
      {
        id: "members", title: B("सदस्यता मंज़ूर करना", "Approving members"), url: "kalchuri.org/admin/members",
        intro: B("मंज़ूरी पर सदस्य को WhatsApp पर सूचना जाती है।", "The member gets a WhatsApp notice on approval."),
        screen: [
          ["top", "Admin → Members"],
          ["card", "m1", B("रमेश कुमार जायसवाल · दीपका", "Ramesh Kumar Jaiswal · Dipka"), B("आवेदन · साधारण सदस्यता", "Applied · General membership")],
          ["row", [["b", "ok", "Approve"], ["b", "no", "Reject", "ghost"]]],
          ["ok", "?done", B("सदस्य मंज़ूर हुआ; सदस्य नंबर अपने-आप बन गया।", "Member approved; the membership number was created automatically.")],
        ],
        steps: [
          { s: B("Admin → Members में नए आवेदन ऊपर दिखते हैं। आवेदन खोलकर जानकारी जाँचिए।", "In Admin → Members new applications are on top. Open one and check the details."), to: "m1", click: true, on: ["m1"] },
          { s: B("सही हो तो «Approve» दबाइए; नहीं तो «Reject»।", "If it is right press “Approve”; otherwise “Reject”."), to: "ok", click: true, on: ["ok"], show: ["done"] },
        ],
      },
      {
        id: "shokletter", title: B("शोक संदेश भेजना", "Sending a condolence letter"), url: "kalchuri.org/admin/shok",
        intro: B("संदेश संस्था के अपने WhatsApp गेटवे से जाते हैं (Admin → Messaging)।", "Letters go out through the organization's own WhatsApp gateway (Admin → Messaging)."),
        screen: [
          ["tabs", [B("1 जानकारी", "1 Details"), B("2 लोग", "2 People"), B("3 समीक्षा", "3 Review")], 0],
          ["f", "dn", B("दिवंगत का नाम", "Name of the departed"), ""],
          ["b", "nx", B("आगे", "Next")],
          ["row", [["chip", "?v1", B("दीपका (42)", "Dipka (42)")], ["chip", "?v2", B("मनगांव (31)", "Mangaon (31)")]]],
          ["b", "?nx2", B("आगे", "Next")],
          ["card", "?rev", B("73 लोगों को भेजा जाएगा", "Will be sent to 73 people"), B("हर एक के आगे लिखा है कि किसके WhatsApp पर जाएगा", "Each row shows whose WhatsApp it goes to")],
          ["b", "?go", B("भेजें", "Send")],
          ["ok", "?done", B("कतार में लग गया। बाद में यहीं «पहुँचा / पढ़ा गया» की गिनती दिखेगी।", "Queued. The delivered / read counts will appear here later.")],
        ],
        steps: [
          { s: B("Admin → Shok sandesh → नया। दिवंगत का नाम, तारीखें और डिज़ाइन चुनिए।", "Admin → Shok sandesh → New. Enter the name and dates and pick a design."), to: "dn", type: B("स्व. शिवप्रसाद जायसवाल", "Late Shivprasad Jaiswal") },
          { s: B("«आगे» दबाइए।", "Press “Next”."), to: "nx", click: true, tab: 1, hide: ["dn", "nx"], show: ["v1", "v2", "nx2"] },
          { s: B("गाँव, परिवार या वंश के हिसाब से लोग चुनिए। जिन्हें यही पत्र जा चुका है वे दोबारा नहीं चुने जाते।", "Pick people by village, family or lineage. Anyone who already got this letter is not picked again."), to: "v1", click: true, on: ["v1", "v2"] },
          { s: B("«आगे» दबाकर पूरी सूची जाँचिए।", "Press “Next” and review the whole list."), to: "nx2", click: true, tab: 2, hide: ["v1", "v2", "nx2"], show: ["rev", "go"] },
          { s: B("«भेजें» दबाइए। संदेश थोड़े-थोड़े अंतर पर जाते हैं; ब्राउज़र बंद करने पर भी भेजना चलता रहता है।", "Press “Send”. Messages go out a few seconds apart and keep going even if you close the browser."), to: "go", click: true, hide: ["go"], show: ["done"] },
        ],
      },
    ],
  },
];
