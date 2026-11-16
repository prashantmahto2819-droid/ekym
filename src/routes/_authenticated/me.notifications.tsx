// मेरी सूचना सेटिंग: हर प्रकार की सूचना × माध्यम (घंटी, फ़ोन/ब्राउज़र push, WhatsApp, ईमेल) — शुरू में सब चालू;
// इस फ़ोन / ब्राउज़र पर push चालू-बंद; शांत समय (WhatsApp रात में नहीं)। DB: k1_notification_prefs (muted_kinds, channels)।
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { call } from "@/community/chat";
import { disablePush, enablePush, pushState, type PushState } from "@/community/push";
import { useLang } from "@/core/i18n";

export const Route = createFileRoute("/_authenticated/me/notifications")({
  head: () => ({ meta: [{ title: "सूचना सेटिंग · Notification settings" }, { name: "robots", content: "noindex" }] }),
  component: Prefs,
});

type Ch = "bell" | "push" | "whatsapp" | "email";
type P = { whatsapp: boolean; email: boolean; quiet_start: number; quiet_end: number; muted_kinds: string[]; channels: Record<string, Partial<Record<Ch, boolean>>>; push_devices?: number };
// [kind, हिंदी, English, किन माध्यमों से जा सकती है]
const GROUPS: [string, string, [string, string, string, Ch[]][]][] = [
  ["💬 चैट व मित्र", "Chat & friends", [
    ["chat_dm", "सीधे संदेश (चैट)", "Direct messages", ["bell", "push", "whatsapp", "email"]],
    ["friend_request", "मित्रता अनुरोध", "Friend requests", ["bell", "push"]],
    ["friend_accept", "अनुरोध स्वीकार", "Accepted requests", ["bell", "push"]],
  ]],
  ["📰 चौपाल (पोस्ट)", "Wall (posts)", [
    ["like", "पसंद 👍", "Likes", ["bell", "push"]], ["comment", "टिप्पणियाँ", "Comments", ["bell", "push"]], ["reply", "जवाब", "Replies", ["bell", "push"]],
    ["mention", "@उल्लेख", "Mentions", ["bell", "push"]], ["moderation", "पोस्ट की समीक्षा", "Post review", ["bell", "push"]],
  ]],
  ["🎉 अवसर", "Occasions", [
    ["wish", "शुभकामनाएँ", "Wishes", ["bell", "push"]], ["birthday", "जन्मदिन", "Birthdays", ["bell", "push", "whatsapp", "email"]], ["anniversary", "वर्षगाँठ", "Anniversaries", ["bell", "push", "whatsapp", "email"]],
  ]],
  ["🏛️ संस्था", "Organisation", [
    ["announcement", "सूचनाएँ / घोषणाएँ", "Announcements", ["bell", "push", "whatsapp", "email"]], ["event", "कार्यक्रम", "Events", ["bell", "push", "whatsapp", "email"]],
    ["blood", "रक्त की ज़रूरत", "Blood requests", ["bell", "push", "whatsapp", "email"]], ["renewal", "सदस्यता नवीनीकरण", "Membership renewal", ["bell", "push", "whatsapp", "email"]],
    ["system", "मंज़ूरी, जिम्मेदारी आदि", "Approvals, roles etc.", ["bell", "push", "whatsapp", "email"]],
  ]],
];
const COLS: [Ch, string, string][] = [["bell", "🔔 घंटी", "🔔 Bell"], ["push", "📱 फ़ोन", "📱 Phone"], ["whatsapp", "WhatsApp", "WhatsApp"], ["email", "✉️ ईमेल", "✉️ Email"]];
const hours = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

function Prefs() {
  const { lang } = useLang(); const L = lang === "hi";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notif_prefs"], queryFn: () => call<P>("k1_notification_prefs_get") });
  const [p, setP] = useState<P | null>(null);
  const [busy, setBusy] = useState(false);
  const [push, setPush] = useState<PushState | null>(null);
  useEffect(() => { if (q.data && !p) setP({ ...q.data, channels: q.data.channels ?? {} }); }, [q.data, p]);
  useEffect(() => { void pushState().then(setPush).catch(() => setPush("unsupported")); }, []);
  if (!p) return <section className="container-page py-10 text-sm text-muted-foreground">…</section>;

  const on = (k: string, c: Ch) => (c === "bell" ? !p.muted_kinds.includes(k) : p.channels[k]?.[c] !== false);
  const set = (k: string, c: Ch, v: boolean) => {
    if (c === "bell") setP({ ...p, muted_kinds: v ? p.muted_kinds.filter((x) => x !== k) : [...new Set([...p.muted_kinds, k])] });
    else setP({ ...p, channels: { ...p.channels, [k]: { ...p.channels[k], [c]: v } } });
  };
  const allKinds = GROUPS.flatMap(([, , ks]) => ks);
  const setAll = (v: boolean) => setP({ ...p, muted_kinds: v ? [] : allKinds.map(([k]) => k), channels: v ? {} : Object.fromEntries(allKinds.map(([k, , , chs]) => [k, Object.fromEntries(chs.filter((c) => c !== "bell").map((c) => [c, false]))])) });

  async function save() {
    setBusy(true);
    try { await call("k1_notification_prefs_save", { p }); await qc.invalidateQueries({ queryKey: ["notif_prefs"] }); await qc.invalidateQueries({ queryKey: ["my_notifications"] }); toast.success(L ? "सहेज लिया" : "Saved"); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function togglePush() {
    try { const st = push === "on" ? await disablePush() : await enablePush(); setPush(st); if (st === "on") toast.success(L ? "इस फ़ोन / ब्राउज़र पर सूचना चालू" : "Notifications on for this device"); }
    catch (e) { toast.error((e as Error).message); }
  }
  const quietOff = p.quiet_start === p.quiet_end;
  return (
    <section className="container-page py-6">
      <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-border bg-card p-4 text-sm sm:p-5">
        <div><h1 className="font-display text-2xl font-semibold">🔔 {L ? "सूचना सेटिंग" : "Notification settings"}</h1><p className="text-muted-foreground">{L ? "कौन-सी सूचना किस माध्यम से आए — आप तय करें। शुरू में सब चालू रहती हैं।" : "Choose which notifications reach you, and how. Everything is on to start with."}</p></div>

        <section className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="font-semibold">📱 {L ? "इस फ़ोन / ब्राउज़र पर सूचना" : "Notifications on this phone / browser"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{L ? "साइट बंद हो तब भी नया संदेश, टिप्पणी आदि फ़ोन की सूचना-पट्टी में दिखेगा। हर फ़ोन / कंप्यूटर पर अलग से चालू करें।" : "Get messages and updates in the phone's notification shade even when the site is closed. Turn on separately on each device."}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {push === "on" || push === "off" ? <Button size="sm" variant={push === "on" ? "outline" : "default"} onClick={() => void togglePush()}>{push === "on" ? (L ? "इस डिवाइस पर बंद करें" : "Turn off on this device") : (L ? "इस डिवाइस पर चालू करें" : "Turn on for this device")}</Button> : null}
            <span className="text-xs">{push === "on" ? (L ? "✅ चालू है" : "✅ On") : push === "denied" ? (L ? "⚠️ ब्राउज़र ने अनुमति रोकी है — ब्राउज़र की साइट सेटिंग में kalchuri.org के लिए Notifications को Allow करें" : "⚠️ Blocked — allow notifications for kalchuri.org in browser site settings") : push === "ios-install" ? (L ? "iPhone पर: Safari में नीचे Share ⬆ → \"Add to Home Screen\" करें, फिर होम स्क्रीन वाले ऐप से यहाँ आकर चालू करें" : "iPhone: Share → Add to Home Screen, then open the app and turn on here") : push === "unsupported" ? (L ? "इस ब्राउज़र में यह सुविधा नहीं है — Chrome इस्तेमाल करें" : "Not supported in this browser — use Chrome") : ""}</span>
            {p.push_devices ? <span className="text-xs text-muted-foreground">· {L ? `कुल ${p.push_devices} डिवाइस जुड़े` : `${p.push_devices} devices connected`}</span> : null}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{L ? "कौन-सी सूचना, किस माध्यम से" : "What, and how"}</p>
            <span className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setAll(true)}>{L ? "सब चालू" : "All on"}</Button><Button size="sm" variant="ghost" onClick={() => setAll(false)}>{L ? "सब बंद" : "All off"}</Button></span></div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-secondary/60"><tr><th className="p-2 text-left">{L ? "सूचना" : "Notification"}</th>{COLS.map(([c, hi, en]) => <th key={c} className="p-2 text-center font-medium">{L ? hi : en}</th>)}</tr></thead>
              <tbody>
                {GROUPS.map(([ghi, gen, ks]) => [
                  <tr key={ghi} className="bg-secondary/30"><td colSpan={5} className="px-2 py-1.5 text-xs font-semibold">{L ? ghi : gen}</td></tr>,
                  ...ks.map(([k, hi, en, chs]) => (
                    <tr key={k} className="border-t border-border/60">
                      <td className="p-2">{L ? hi : en}</td>
                      {COLS.map(([c]) => <td key={c} className="p-2 text-center">{chs.includes(c) ? <input type="checkbox" className="size-4" checked={on(k, c)} onChange={(e) => set(k, c, e.target.checked)} aria-label={`${en} ${c}`} /> : <span className="text-muted-foreground">—</span>}</td>)}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={p.whatsapp} onChange={(e) => setP({ ...p, whatsapp: e.target.checked })} /> {L ? "WhatsApp सूचनाएँ (मुख्य स्विच)" : "WhatsApp (master switch)"}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={p.email} onChange={(e) => setP({ ...p, email: e.target.checked })} /> {L ? "ईमेल सूचनाएँ (मुख्य स्विच)" : "Email (master switch)"}</label>
          </div>
          <p className="text-xs text-muted-foreground">{L ? "चैट के सीधे संदेश की WhatsApp / ईमेल / फ़ोन सूचना तभी जाती है जब आप उस समय साइट पर नहीं होते। किसी एक चैट को कुछ समय के लिए बंद करना हो तो उस चैट में 🔔 दबाकर म्यूट करें। शोक संदेश और लॉगिन OTP इन सेटिंग से नहीं रुकते।" : "Chat alerts on WhatsApp / email / phone go only when you are not on the site. To silence one chat for a while, use 🔔 inside that chat. Condolence letters and login OTP are not affected."}</p>
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
        <div className="sticky bottom-16 flex flex-wrap justify-between gap-2 rounded-xl bg-card/95 py-2 backdrop-blur lg:bottom-0"><Link to="/me/profile" className="self-center text-xs underline">{L ? "प्रोफ़ाइल गोपनीयता (मोबाइल / जन्मदिन दिखाना, DM)" : "Profile privacy"}</Link><Button onClick={() => void save()} disabled={busy}>{L ? "सहेजें" : "Save"}</Button></div>
      </div>
    </section>
  );
}
