// My notification settings: WhatsApp / email on-off, quiet hours (WhatsApp held until morning), muted bell kinds.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { call } from "@/community/chat";
import { useLang } from "@/core/i18n";

export const Route = createFileRoute("/_authenticated/me/notifications")({
  head: () => ({ meta: [{ title: "सूचना सेटिंग · Notification settings" }, { name: "robots", content: "noindex" }] }),
  component: Prefs,
});

type P = { whatsapp: boolean; email: boolean; quiet_start: number; quiet_end: number; muted_kinds: string[] };
const KINDS: [string, string, string][] = [
  ["like", "पसंद (👍)", "Likes"], ["comment", "टिप्पणियाँ", "Comments"], ["reply", "जवाब", "Replies"], ["mention", "@उल्लेख", "Mentions"],
  ["chat_dm", "चैट संदेश", "Chat messages"], ["friend_request", "मित्रता अनुरोध", "Friend requests"], ["friend_accept", "अनुरोध स्वीकार", "Accepted requests"],
  ["wish", "शुभकामनाएँ", "Wishes"], ["birthday", "जन्मदिन", "Birthdays"], ["anniversary", "वर्षगाँठ", "Anniversaries"],
];
const hours = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

function Prefs() {
  const { lang } = useLang(); const L = lang === "hi";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notif_prefs"], queryFn: () => call<P>("k1_notification_prefs_get") });
  const [p, setP] = useState<P | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data && !p) setP(q.data); }, [q.data, p]);
  if (!p) return <section className="container-page py-10 text-sm text-muted-foreground">…</section>;
  async function save() {
    setBusy(true);
    try { await call("k1_notification_prefs_save", { p }); await qc.invalidateQueries({ queryKey: ["notif_prefs"] }); await qc.invalidateQueries({ queryKey: ["my_notifications"] }); toast.success(L ? "सहेज लिया" : "Saved"); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const quietOff = p.quiet_start === p.quiet_end;
  return (
    <section className="container-page py-6">
      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-5 text-sm">
        <div><h1 className="font-display text-2xl font-semibold">🔔 {L ? "सूचना सेटिंग" : "Notification settings"}</h1><p className="text-muted-foreground">{L ? "आपको कब और कैसे सूचना मिले, यह आप तय करें। ऐप के अंदर की घंटी (🔔) में सब हमेशा दिखता है।" : "Choose how and when you are notified. Everything always shows in the in-app bell."}</p></div>
        <section className="space-y-2">
          <p className="font-semibold">{L ? "माध्यम" : "Channels"}</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.whatsapp} onChange={(e) => setP({ ...p, whatsapp: e.target.checked })} /> WhatsApp {L ? "पर सूचना (मंज़ूरी, जिम्मेदारी, नवीनीकरण, बधाई आदि)" : "messages (approvals, roles, renewals, greetings…)"}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.email} onChange={(e) => setP({ ...p, email: e.target.checked })} /> {L ? "ईमेल पर सूचना" : "Email"}</label>
          <p className="text-xs text-muted-foreground">{L ? "शोक संदेश (शोकपत्र) और ज़रूरी सुरक्षा संदेश (जैसे लॉगिन OTP) इन सेटिंग से नहीं रुकते।" : "Condolence letters and security messages (login OTP) are not affected by these settings."}</p>
        </section>
        <section className="space-y-2">
          <p className="font-semibold">🌙 {L ? "शांत समय (WhatsApp नहीं आएगा)" : "Quiet hours (no WhatsApp)"}</p>
          <div className="flex flex-wrap items-center gap-2">
            {L ? "से" : "From"} <select className="h-9 rounded-md border border-input bg-background px-2" value={p.quiet_start} onChange={(e) => setP({ ...p, quiet_start: Number(e.target.value) })}>{hours.map((h) => <option key={h} value={h}>{hh(h)}</option>)}</select>
            {L ? "तक" : "to"} <select className="h-9 rounded-md border border-input bg-background px-2" value={p.quiet_end} onChange={(e) => setP({ ...p, quiet_end: Number(e.target.value) })}>{hours.map((h) => <option key={h} value={h}>{hh(h)}</option>)}</select>
            <Button size="sm" variant="ghost" onClick={() => setP({ ...p, quiet_start: 0, quiet_end: 0 })}>{L ? "शांत समय बंद" : "Turn off"}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{quietOff ? (L ? "शांत समय बंद है — WhatsApp कभी भी आ सकता है।" : "Quiet hours are off.") : (L ? `${hh(p.quiet_start)} से ${hh(p.quiet_end)} (भारतीय समय) के बीच के WhatsApp रोककर समय खत्म होते ही भेजे जाएँगे।` : `WhatsApp between ${hh(p.quiet_start)} and ${hh(p.quiet_end)} IST is held and sent when the window ends.`)}</p>
        </section>
        <section className="space-y-2">
          <p className="font-semibold">{L ? "घंटी में क्या न दिखे" : "Hide from the bell"}</p>
          <div className="grid grid-cols-2 gap-1">{KINDS.map(([k, hi, en]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={p.muted_kinds.includes(k)} onChange={(e) => setP({ ...p, muted_kinds: e.target.checked ? [...p.muted_kinds, k] : p.muted_kinds.filter((x) => x !== k) })} /> {L ? hi : en}</label>)}</div>
        </section>
        <div className="flex flex-wrap justify-between gap-2"><Link to="/me/profile" className="self-center text-xs underline">{L ? "प्रोफ़ाइल गोपनीयता (जन्मदिन/मोबाइल दिखाना)" : "Profile privacy"}</Link><Button onClick={() => void save()} disabled={busy}>{L ? "सहेजें" : "Save"}</Button></div>
      </div>
    </section>
  );
}
