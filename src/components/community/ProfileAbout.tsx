// समुदाय प्रोफ़ाइल का खंडवार परिचय (cm_user_profiles.about, RPC k1_profile_save_about): परिभाषा, भरने का फ़ॉर्म, और दिखाने वाले खंड।
import { Award, Briefcase, GraduationCap, HandHeart, Home, Link2, MapPin, User, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type About = Partial<Record<AboutKey, string>> & { show_family?: boolean };
export type AboutKey =
  | "gender" | "blood_group" | "marital_status" | "languages"
  | "company" | "designation" | "work_place" | "education" | "college" | "skills"
  | "hometown" | "gotra" | "father_name" | "spouse_name" | "children"
  | "social_work" | "achievements" | "linkedin" | "twitter" | "whatsapp_channel";

type Field = { k: AboutKey; hi: string; en: string; ph?: [string, string]; opts?: [string, string][]; long?: boolean };
export type SectionId = "basic" | "work" | "place" | "family" | "society";
export const ABOUT_SECTIONS: { id: SectionId; hi: string; en: string; icon: ReactNode; fields: Field[] }[] = [
  { id: "basic", hi: "मूल जानकारी", en: "Basic info", icon: <User />, fields: [
    { k: "gender", hi: "लिंग", en: "Gender", opts: [["पुरुष", "Male"], ["महिला", "Female"], ["अन्य", "Other"]] },
    { k: "blood_group", hi: "रक्त समूह", en: "Blood group", opts: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((x) => [x, x]) },
    { k: "marital_status", hi: "वैवाहिक स्थिति", en: "Marital status", opts: [["अविवाहित", "Single"], ["विवाहित", "Married"], ["विधुर / विधवा", "Widowed"], ["तलाक़शुदा", "Divorced"]] },
    { k: "languages", hi: "भाषाएँ", en: "Languages", ph: ["हिंदी, छत्तीसगढ़ी, अंग्रेज़ी", "Hindi, English"] },
  ] },
  { id: "work", hi: "कार्य व शिक्षा", en: "Work & education", icon: <Briefcase />, fields: [
    { k: "company", hi: "कंपनी / संस्था / अपना व्यवसाय", en: "Company / organisation / own business", ph: ["जैसे Vivid Brandify", "e.g. Vivid Brandify"] },
    { k: "designation", hi: "पद", en: "Designation", ph: ["जैसे मार्केटिंग मैनेजर", "e.g. Marketing Manager"] },
    { k: "work_place", hi: "कार्यस्थल (शहर)", en: "Work place (city)" },
    { k: "education", hi: "शिक्षा", en: "Education", ph: ["जैसे बी.कॉम., एम.बी.ए.", "e.g. B.Com, MBA"] },
    { k: "college", hi: "स्कूल / कॉलेज", en: "School / college" },
    { k: "skills", hi: "कौशल / विशेषज्ञता", en: "Skills / expertise", ph: ["जैसे लेखा, डिज़ाइन, खेती, कंप्यूटर", "e.g. accounts, design, farming"], long: true },
  ] },
  { id: "place", hi: "स्थान", en: "Places", icon: <MapPin />, fields: [
    { k: "hometown", hi: "मूल ग्राम / पैतृक स्थान", en: "Hometown / native place" },
  ] },
  { id: "family", hi: "परिवार", en: "Family", icon: <Users />, fields: [
    { k: "gotra", hi: "गोत्र", en: "Gotra" },
    { k: "father_name", hi: "पिता का नाम", en: "Father's name" },
    { k: "spouse_name", hi: "जीवनसाथी का नाम", en: "Spouse's name" },
    { k: "children", hi: "संतान", en: "Children", ph: ["जैसे 1 पुत्र, 1 पुत्री", "e.g. 1 son, 1 daughter"] },
  ] },
  { id: "society", hi: "समाज सेवा व उपलब्धियाँ", en: "Community work & achievements", icon: <HandHeart />, fields: [
    { k: "social_work", hi: "समाज सेवा / सामाजिक कार्य", en: "Community / social work", ph: ["जैसे रक्तदान शिविर, युवा मंच में सक्रिय", "e.g. blood camps, youth wing"], long: true },
    { k: "achievements", hi: "उपलब्धियाँ / सम्मान", en: "Achievements / awards", long: true },
  ] },
];
const ALL = ABOUT_SECTIONS.flatMap((s) => s.fields);
export const labelOf = (k: AboutKey, L: boolean) => { const f = ALL.find((x) => x.k === k); return f ? (L ? f.hi : f.en) : k; };
const val = (a: About, f: Field, L: boolean) => { const v = a[f.k]; if (!v) return ""; const o = f.opts?.find(([hi, en]) => hi === v || en === v); return o ? (L ? o[0] : o[1]) : v; };

/** भरने का फ़ॉर्म — हर खंड अलग डिब्बे में; extras = पुराने खाने (व्यवसाय, गाँव/ज़िला/राज्य, रुचियाँ) अपने खंड में सबसे ऊपर */
export function AboutEditor({ a, onChange, L, extras }: { a: About; onChange: (a: About) => void; L: boolean; extras?: Partial<Record<SectionId, ReactNode>> }) {
  const set = (k: AboutKey, v: string) => onChange({ ...a, [k]: v });
  return (
    <div className="space-y-3">
      {ABOUT_SECTIONS.map((s) => (
        <fieldset key={s.id} className="rounded-xl border border-border p-3">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold [&>svg]:size-4">{s.icon}{L ? s.hi : s.en}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {extras?.[s.id] ?? null}
            {s.fields.map((f) => (
              <label key={f.k} className={`text-sm ${f.long ? "sm:col-span-2" : ""}`}>
                <span className="mb-1 block text-xs text-muted-foreground">{L ? f.hi : f.en}</span>
                {f.opts ? (
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={a[f.k] ?? ""} onChange={(e) => set(f.k, e.target.value)}>
                    <option value="">{L ? "— चुनें —" : "— choose —"}</option>
                    {f.opts.map(([hi, en]) => <option key={hi} value={hi}>{L ? hi : en}</option>)}
                  </select>
                ) : f.long ? <Textarea rows={2} maxLength={1000} value={a[f.k] ?? ""} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph ? (L ? f.ph[0] : f.ph[1]) : undefined} />
                  : <Input maxLength={200} value={a[f.k] ?? ""} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph ? (L ? f.ph[0] : f.ph[1]) : undefined} />}
              </label>
            ))}
          </div>
          {s.id === "family" ? <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={a.show_family !== false} onChange={(e) => onChange({ ...a, show_family: e.target.checked })} /> {L ? "पिता, जीवनसाथी और संतान के नाम दूसरे सदस्यों को दिखें (गोत्र हमेशा दिखेगा)" : "Show father, spouse and children to other members (gotra is always shown)"}</label> : null}
        </fieldset>
      ))}
    </div>
  );
}

/** दिखाने वाला एक खंड (परिचय टैब) */
export function AboutSection({ id, a, L, extra, box }: { id: SectionId; a: About; L: boolean; extra?: { icon: ReactNode; label: string; value: ReactNode }[]; box: string }) {
  const s = ABOUT_SECTIONS.find((x) => x.id === id)!;
  const rows = [...(extra ?? []), ...s.fields.filter((f) => a[f.k]).map((f) => ({ icon: iconFor(f.k), label: L ? f.hi : f.en, value: <span className="whitespace-pre-wrap">{val(a, f, L)}</span> }))];
  if (!rows.length) return null;
  return (
    <section className={`${box} space-y-3`}>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold [&>svg]:size-5 [&>svg]:text-primary">{s.icon}{L ? s.hi : s.en}</h2>
      <ul className="space-y-3 text-sm">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground [&>svg]:size-5">{r.icon}</span><span className="min-w-0"><span className="block">{r.value}</span><span className="block text-xs text-muted-foreground">{r.label}</span></span></li>
        ))}
      </ul>
    </section>
  );
}
function iconFor(k: AboutKey): ReactNode {
  if (["education", "college"].includes(k)) return <GraduationCap />;
  if (["company", "designation", "work_place", "skills"].includes(k)) return <Briefcase />;
  if (k === "hometown") return <Home />;
  if (["achievements"].includes(k)) return <Award />;
  if (["social_work"].includes(k)) return <HandHeart />;
  if (["gotra", "father_name", "spouse_name", "children"].includes(k)) return <Users />;
  if (["linkedin", "twitter", "whatsapp_channel"].includes(k)) return <Link2 />;
  return <User />;
}

/** परिचय-कार्ड के लिए एक लाइन वाले मुख्य बिंदु */
export function workLine(a: About, occupation: string | null, L: boolean) {
  const role = [a.designation, a.company].filter(Boolean).join(L ? " · " : " at ");
  return role || occupation || "";
}
