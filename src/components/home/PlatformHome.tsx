// Kalchuri One की मुख्य साइट (kalchuri.org, मूल संस्था) के होम पेज का परिचय-भाग: मंच क्या है, गिनती, सदस्यों की सेवाएँ,
// संस्थाओं के लिए क्या मिलता है, शुरू करने के कदम, भरोसा, सवाल-जवाब। संस्थाओं की अपनी साइटों पर नहीं दिखता।
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Counts = { orgs: number; members: number; families: number; people: number; events: number; donors: number };

const SERVICES: [string, string, string, string, string, string][] = [
  // [icon, हिंदी, English, विवरण, description, link]
  ["🪪", "सदस्यता व ID कार्ड", "Membership & ID card", "ऑनलाइन सदस्य बनें, मंज़ूरी के बाद डिजिटल पहचान पत्र और सदस्य क्रमांक।", "Join online; get a digital ID card and member number once approved.", "/join"],
  ["📰", "चौपाल", "Community wall", "समाज की ख़बरें, पोस्ट, फोटो, स्टोरी, शुभकामनाएँ और जन्मदिन।", "Community posts, photos, stories, wishes and birthdays.", "/community"],
  ["💬", "चैट", "Chat", "सदस्यों से सीधी बातचीत और समूह, फोटो-दस्तावेज़ के साथ; हर पेज पर छोटी चैट-खिड़की।", "Direct and group chats with photos and documents, on every page.", "/community/chat"],
  ["🪔", "शोक पत्र व वंश वृक्ष", "Condolence letters & family trees", "परिवार का वंश वृक्ष, और शोक की घड़ी में हर परिजन तक नाम सहित शोक पत्र व्हाट्सएप पर।", "Family trees and personalised condolence letters on WhatsApp.", "/shok"],
  ["💍", "वैवाहिक", "Matrimony", "सत्यापित प्रोफ़ाइल, बायोडाटा कार्ड, रुचि भेजना — नंबर तभी दिखे जब दोनों तरफ़ से हाँ हो।", "Verified profiles, biodata cards, interests; numbers only after mutual yes.", "/matrimony"],
  ["🩸", "रक्त सेवा", "Blood seva", "रक्तदाताओं की सूची, ज़रूरत पड़ने पर तुरंत सूचना।", "Blood donor list and instant requests.", "/blood"],
  ["📅", "आयोजन", "Events", "कार्यक्रम, पंजीयन, कैलेंडर में जोड़ना और नक्शा।", "Events, registration, calendar and map.", "/events"],
  ["📝", "परीक्षा", "Exams", "समाज की प्रतियोगी व ज्ञान परीक्षाएँ, परिणाम और प्रमाणपत्र।", "Community quizzes and exams with results and certificates.", "/exams"],
  ["🏪", "व्यापार", "Business", "समाज के व्यापारियों के पेज — उत्पाद, सेवाएँ, संपर्क।", "Business pages of community members.", "/business"],
  ["🗞️", "समाचार व लेख", "News & blogs", "संस्थाओं की ख़बरें, लेख और घोषणाएँ।", "News, articles and announcements.", "/news"],
  ["🖼️", "गैलरी", "Gallery", "कार्यक्रमों की फोटो एल्बम।", "Photo albums of events.", "/gallery"],
  ["🏛️", "संस्थाएँ", "Organizations", "समाज की सभी संस्थाएँ और उनकी शाखाएँ एक जगह।", "All community organizations and branches in one place.", "/organizations"],
];

const FOR_ORGS: [string, string, string][] = [
  ["🌐", "अपनी वेबसाइट", "आपकी संस्था की अपनी साइट (जैसे संस्था.kalchuri.org) — होम पेज, टीम, आयोजन, समाचार, गैलरी।"],
  ["👥", "सदस्य व मंज़ूरी", "ऑनलाइन आवेदन, मंज़ूरी, सदस्य क्रमांक, ID कार्ड, नवीनीकरण की याद।"],
  ["🛡️", "एडमिन व भूमिकाएँ", "अध्यक्ष, सचिव, कोषाध्यक्ष, क्षेत्र-वार एडमिन — हर किसी को उतनी ही पहुँच जितनी ज़रूरी।"],
  ["📲", "WhatsApp व ईमेल संदेश", "अपने नंबर से सभी सदस्यों या चुने हुए लोगों को सूचना, निमंत्रण और शोक पत्र।"],
  ["🌳", "वंश वृक्ष व शोक पत्र", "संस्था-वार अलग वंश वृक्ष; शोक पत्र और निमंत्रण गाँव-वार भेजना।"],
  ["📊", "हिसाब-किताब व रिपोर्ट", "चंदा, रसीद, खर्च और रिपोर्ट; डैशबोर्ड पर पूरी स्थिति।"],
];

const FAQ: [string, string][] = [
  ["क्या Kalchuri One का कोई शुल्क है?", "सदस्यों के लिए नहीं। संस्थाएँ अपनी साइट और सेवाएँ चलाने के लिए मंच के प्रबंधकों से बात कर सकती हैं।"],
  ["मैं एक से ज़्यादा संस्थाओं का सदस्य हूँ", "एक खाते से कई संस्थाओं से जुड़ सकते हैं। आपकी एक ‘मूल संस्था’ रहती है; बाकी संस्थाओं में वहाँ के एडमिन की मंज़ूरी से जुड़ते हैं।"],
  ["मेरी जानकारी कौन देख सकता है?", "मोबाइल नंबर और पता सिर्फ़ आपकी सेटिंग के हिसाब से दिखते हैं; संस्था के एडमिन सिर्फ़ अपने सदस्यों की जानकारी देखते हैं।"],
  ["अपनी संस्था को Kalchuri One पर कैसे लाएँ?", "‘संपर्क करें’ पेज से बताइए — संस्था की साइट, एडमिन और सदस्य-सूची तैयार करने में मदद की जाती है।"],
];

export function PlatformHome({ L }: { L: boolean }) {
  const counts = useQuery({ queryKey: ["platform_counts"], staleTime: 10 * 60_000, queryFn: async () => { const { data } = await supabase.rpc("k1_platform_counts" as never); return (data ?? null) as Counts | null; } });
  const c = counts.data;
  const stats: [number | undefined, string, string][] = [
    [c?.orgs, "संस्थाएँ", "Organizations"], [c?.members, "सदस्य", "Members"], [c?.families, "परिवार (वंश वृक्ष)", "Family trees"],
    [c?.people, "वंश वृक्ष में लोग", "People in trees"], [c?.events, "आयोजन", "Events"], [c?.donors, "रक्तदाता", "Blood donors"],
  ];
  return (
    <>
      {/* परिचय */}
      <section className="border-b border-border bg-gradient-to-b from-amber-50/70 to-background py-14 dark:from-amber-950/20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Kalchuri One · कलचुरी वन</p>
            <h2 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{L ? "एक समाज, एक मंच — कलचुरी / कलार समाज की हर संस्था और हर परिवार के लिए" : "One community, one platform — for every Kalchuri / Kalar organization and family"}</h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">{L ? "Kalchuri One समाज का साझा डिजिटल मंच है। हर संस्था की अपनी वेबसाइट, सदस्य और एडमिन हैं; और सदस्यों को एक ही खाते से चौपाल, चैट, वैवाहिक, रक्त सेवा, आयोजन, परीक्षा, वंश वृक्ष और शोक पत्र जैसी सेवाएँ मिलती हैं — मोबाइल पर ऐप की तरह।" : "Kalchuri One is the community's shared digital platform. Each organization has its own website, members and admins; members use one account for the wall, chat, matrimony, blood seva, events, exams, family trees and condolence letters — like an app on the phone."}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="lg"><Link to="/join">{L ? "सदस्य बनें" : "Become a member"} <ArrowRight className="size-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/organizations">{L ? "अपनी संस्था खोजें" : "Find your organization"}</Link></Button>
              <Button asChild size="lg" variant="ghost"><Link to="/community">{L ? "चौपाल देखें" : "See the wall"}</Link></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map(([n, hi, en]) => (
              <div key={en} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
                <p className="font-display text-3xl font-bold text-primary">{n === undefined ? "…" : n.toLocaleString("en-IN")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{L ? hi : en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* सदस्यों की सेवाएँ */}
      <section className="py-14">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{L ? "सदस्यों के लिए सेवाएँ" : "Services for members"}</h2>
          <p className="mt-1 text-muted-foreground">{L ? "एक खाता, सारी सेवाएँ — कोई भी पेज खोलकर शुरू कीजिए।" : "One account, every service."}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SERVICES.map(([ic, hi, en, dhi, den, to]) => (
              <Link key={to} to={to as "/"} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <span className="text-3xl">{ic}</span>
                <p className="mt-2 font-semibold group-hover:text-primary">{L ? hi : en}</p>
                <p className="mt-1 text-sm text-muted-foreground">{L ? dhi : den}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* संस्थाओं के लिए */}
      <section className="bg-[#14213d] py-14 text-white">
        <div className="container-page">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">{L ? "संस्थाओं के लिए" : "For organizations"}</p>
          <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{L ? "अपनी संस्था का पूरा काम एक जगह" : "Run your whole organization in one place"}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FOR_ORGS.map(([ic, t, d]) => (
              <div key={t} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="font-semibold"><span className="mr-1.5">{ic}</span>{t}</p>
                <p className="mt-1 text-sm text-white/75">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild className="bg-amber-300 text-[#14213d] hover:bg-amber-200"><Link to="/contact">{L ? "अपनी संस्था जोड़ें — संपर्क करें" : "Add your organization — contact us"}</Link></Button>
            <Button asChild variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10"><Link to="/organizations">{L ? "जुड़ी हुई संस्थाएँ" : "Member organizations"}</Link></Button>
          </div>
        </div>
      </section>

      {/* शुरू करने के कदम + भरोसा */}
      <section className="py-14">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold">{L ? "शुरू कैसे करें" : "How to start"}</h2>
            <ol className="mt-5 space-y-4">
              {(L ? [
                ["मोबाइल नंबर से लॉगिन", "व्हाट्सएप पर आए कोड से — कोई पासवर्ड याद नहीं रखना।"],
                ["अपनी संस्था के सदस्य बनें", "फ़ॉर्म भरें; संस्था के एडमिन मंज़ूरी देंगे और ID कार्ड मिलेगा।"],
                ["प्रोफ़ाइल पूरी करें", "फोटो, कार्य, शिक्षा, मूल ग्राम — ताकि समाज के लोग आपको पहचान सकें।"],
                ["ऐप की तरह इस्तेमाल करें", "फ़ोन पर ‘होम स्क्रीन पर जोड़ें’ करें और सूचनाएँ चालू करें।"],
              ] : [
                ["Sign in with your mobile", "With a WhatsApp code — no password to remember."],
                ["Join your organization", "Fill the form; its admins approve and you get an ID card."],
                ["Complete your profile", "Photo, work, education, hometown — so people can find you."],
                ["Use it like an app", "Add to home screen and turn on notifications."],
              ]).map(([t, d], i) => (
                <li key={t} className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span><span><b>{t}</b><span className="block text-sm text-muted-foreground">{d}</span></span></li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl font-bold">{L ? "भरोसा और गोपनीयता" : "Trust & privacy"}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>🔒 {L ? "आपका मोबाइल नंबर और पता आपकी सेटिंग के बिना किसी को नहीं दिखता।" : "Your number and address are hidden unless you allow it."}</li>
              <li>🏛️ {L ? "हर संस्था का डेटा अलग — एडमिन सिर्फ़ अपनी संस्था के सदस्य देखते हैं।" : "Each organization's data is separate."}</li>
              <li>✅ {L ? "सदस्य, वैवाहिक प्रोफ़ाइल और व्यापार पेज एडमिन की जाँच के बाद ही दिखते हैं।" : "Members, matrimony profiles and business pages are verified first."}</li>
              <li>🧹 {L ? "चैट की फोटो-फ़ाइलें 30 दिन बाद अपने-आप हटती हैं; सूचनाएँ आप खुद चुनते हैं।" : "Chat files auto-delete after 30 days; you choose your notifications."}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* सवाल-जवाब */}
      <section className="border-t border-border bg-secondary/30 py-14">
        <div className="container-page max-w-3xl">
          <h2 className="font-display text-2xl font-bold">{L ? "अक्सर पूछे जाने वाले सवाल" : "Frequently asked questions"}</h2>
          <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-4"><summary className="cursor-pointer font-medium">{q}</summary><p className="mt-2 text-sm text-muted-foreground">{a}</p></details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
