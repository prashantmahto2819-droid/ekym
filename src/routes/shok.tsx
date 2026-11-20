// /shok — हर संस्था का अपना "शोक पत्र व वंश वृक्ष" (संस्था-वार अलग, साझा नहीं)।
// * प्रगतिशील समाज: उनका पुराना ऐप shokpatra.kalchuri.org ही खुलता है (दोनों पते चलते रहें)।
// * दूसरी संस्थाएँ: यहीं — मेरे परिवार, नया परिवार (इसी संस्था में), संस्था के मंज़ूर परिवार, एडमिन के लिए लिंक।
// * मुख्य साइट (kalchuri.org): अपनी संस्था चुनने को कहा जाता है।
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { NewFamilyDialog } from "@/routes/_authenticated/admin.families.index";

export const SHOK_APP = "https://shokpatra.kalchuri.org/app.html";
export const SHOK_HOME_SLUG = "pragatishil-kalar-samaj";

export const Route = createFileRoute("/shok")({
  head: () => ({ meta: [{ title: "शोक पत्र व वंश वृक्ष" }] }),
  component: ShokHome,
});

type Row = { id: string; family_name: string; village_name: string | null; status: string; members: number; head_name: string | null; mine: boolean; managed: boolean };
const ST: Record<string, [string, string]> = { draft: ["ड्राफ़्ट", "bg-secondary"], pending: ["मंज़ूरी बाकी", "bg-amber-100 text-amber-900"], approved: ["मंज़ूर", "bg-emerald-100 text-emerald-900"], rejected: ["अस्वीकार", "bg-rose-100 text-rose-900"] };

function ShokHome() {
  const tenant = useTenant();
  const L = useLang().lang === "hi";
  const { user, loading, isStaff, isPlatformAdmin } = useAuth();
  const nav = useNavigate();
  const orgName = (L ? tenant.name_hi || tenant.name : tenant.name) ?? "";
  const home = tenant.slug === SHOK_HOME_SLUG;
  const root = !tenant.parent_id;
  useEffect(() => { if (home) window.location.replace(SHOK_APP); }, [home]);

  const tithi = useQuery({ queryKey: ["shok_punyatithi", tenant.organization_id], enabled: !!user, queryFn: async () => { const { data } = await supabase.rpc("shok_upcoming_punyatithi_org" as never, { p_org: tenant.organization_id, p_days: 30 } as never); return (data ?? []) as unknown as { member_id: string; name: string; family_id: string; family_name: string; village_name: string | null; next_date: string; years: number }[]; } });
  const member = useQuery({ queryKey: ["is_member", tenant.organization_id, user?.id], enabled: !!user && !home && !root, queryFn: async () => { const { data } = await supabase.rpc("k1_is_member", { p_org: tenant.organization_id }); return !!data; } });
  const rows = useQuery({
    queryKey: ["k1_families_org", tenant.organization_id, user?.id], enabled: !!user && !home && !root,
    queryFn: async () => { const { data, error } = await supabase.rpc("k1_families", { p_org: tenant.organization_id, p_limit: 500 } as never); if (error) throw error; return (data ?? []) as unknown as Row[]; },
  });
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  if (home) {
    return <section className="container-page py-16 text-center text-sm"><p>🪔 {L ? "प्रगतिशील जायसवाल कन्नौजिया कलार समाज की शोकपत्र सेवा खुल रही है…" : "Opening the shokpatra app…"}</p><p className="mt-2"><a href={SHOK_APP} className="text-primary underline">{L ? "न खुले तो यहाँ दबाएँ" : "Tap here if it doesn't open"}</a></p></section>;
  }
  if (root) {
    return (
      <>
        <PageHeader icon={<span>🪔</span>} title={L ? "शोक पत्र व वंश वृक्ष" : "Condolence letters & family trees"} description={L ? "हर संस्था का वंश वृक्ष और शोक पत्र अलग-अलग रहता है। अपनी संस्था की साइट खोलें।" : "Each organization keeps its own family trees and letters. Open your organization's site."} />
        <section className="container-page max-w-2xl space-y-3 py-8 text-sm">
          <a href={SHOK_APP} className="block rounded-xl border border-border p-4 hover:bg-secondary"><b>प्रगतिशील जायसवाल कन्नौजिया कलार समाज</b><span className="block text-muted-foreground">shokpatra.kalchuri.org</span></a>
          <Link to="/organizations" className="block rounded-xl border border-border p-4 hover:bg-secondary"><b>{L ? "दूसरी संस्थाएँ →" : "Other organizations →"}</b><span className="block text-muted-foreground">{L ? "अपनी संस्था चुनें, फिर उसकी साइट पर मेनू में \"शोक संदेश व वंश वृक्ष\"" : "Pick your organization, then \"Shok sandesh & family tree\" in its menu"}</span></Link>
        </section>
      </>
    );
  }

  const list = rows.data ?? [];
  const mine = list.filter((r) => r.mine || r.managed);
  const k = q.trim().toLowerCase();
  const dir = list.filter((r) => r.status === "approved" && !r.mine && (!k || [r.family_name, r.village_name, r.head_name].some((x) => (x ?? "").toLowerCase().includes(k))));
  const admin = isStaff || isPlatformAdmin;
  return (
    <>
      <PageHeader icon={<span>🪔</span>} title={L ? `शोक पत्र व वंश वृक्ष — ${orgName}` : `Condolence letters & family trees — ${orgName}`} description={L ? `यह ${orgName} का अपना हिस्सा है — यहाँ बने परिवार और भेजे गए शोक पत्र सिर्फ़ इसी संस्था के हैं।` : `This belongs to ${orgName} — families and letters here stay within this organization.`} />
      <section className="container-page max-w-4xl space-y-6 py-8 text-sm">
        {loading ? <div className="h-24 animate-pulse rounded-xl bg-muted" /> : !user ? (
          <div className="rounded-xl border border-border p-5 text-center"><p>{L ? "अपना वंश वृक्ष बनाने और देखने के लिए लॉगिन करें।" : "Sign in to build and view family trees."}</p><Button className="mt-3" onClick={() => void nav({ to: "/auth", search: { redirect: "/shok" } as never })}>{L ? "लॉगिन करें" : "Sign in"}</Button></div>
        ) : member.data === false && !admin ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:bg-amber-950/30"><p>{L ? `वंश वृक्ष ${orgName} के सदस्य ही बना सकते हैं। पहले सदस्य बनें — मंज़ूरी के बाद यहाँ आएँ।` : `Only members of ${orgName} can build family trees here. Become a member first.`}</p><Button asChild className="mt-3"><Link to="/join">{L ? "सदस्य बनें" : "Become a member"}</Link></Button></div>
        ) : (
          <>
            {tithi.data?.length ? (
              <div className="rounded-xl border border-border bg-card p-4 text-sm">
                <h2 className="font-display text-lg font-semibold">🪔 {L ? "आने वाली पुण्यतिथियाँ (30 दिन)" : "Upcoming death anniversaries (30 days)"}</h2>
                <ul className="mt-2 divide-y divide-border">
                  {tithi.data.slice(0, 30).map((t) => (
                    <li key={t.member_id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span><b>{new Date(t.next_date).toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "long" })}</b> — {L ? "स्व." : "Late"} {t.name} <span className="text-muted-foreground">· {[t.family_name, t.village_name].filter(Boolean).join(" · ")}{t.years > 0 ? (L ? ` · ${t.years}वीं` : ` · year ${t.years}`) : ""}</span></span>
                      <Link to="/shok/family/$id" params={{ id: t.family_id }} className="text-primary hover:underline">{L ? "परिवार" : "Family"}</Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">{L ? "यह सिर्फ़ याद के लिए है — किसी को अपने आप संदेश नहीं जाता।" : "A reminder only — no message is sent automatically."}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold">👪 {L ? "मेरे परिवार" : "My families"}</h2>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setNewOpen(true)}>+ {L ? "नया परिवार (वंश वृक्ष)" : "New family"}</Button>
                <Button size="sm" variant="outline" asChild><Link to="/shok/tributes">🪔 {L ? "श्रद्धांजलि पेज" : "Tribute pages"}</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/shok/forest">🌳 {L ? "सभी वंश वृक्ष / खोज" : "All trees / search"}</Link></Button>
                {admin ? <Button size="sm" variant="outline" asChild><Link to="/admin/families">{L ? "सभी परिवार (एडमिन)" : "All families (admin)"}</Link></Button> : null}
                {admin ? <Button size="sm" variant="outline" asChild><Link to="/admin/shok/send">✉️ {L ? "शोक पत्र भेजें" : "Send letter"}</Link></Button> : null}
              </div>
            </div>
            {rows.isLoading ? <div className="h-20 animate-pulse rounded-xl bg-muted" /> : mine.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">{mine.map((r) => (
                <li key={r.id}><Link to="/shok/family/$id" params={{ id: r.id }} className="block rounded-xl border border-border p-3 hover:bg-secondary">
                  <span className="flex items-center justify-between gap-2"><b>{r.family_name}</b><span className={`rounded-full px-2 py-0.5 text-[11px] ${ST[r.status]?.[1] ?? ""}`}>{ST[r.status]?.[0] ?? r.status}</span></span>
                  <span className="block text-xs text-muted-foreground">{[r.head_name && `${L ? "मुखिया" : "Head"}: ${r.head_name}`, r.village_name, `${r.members} ${L ? "सदस्य" : "members"}`].filter(Boolean).join(" · ")}</span>
                </Link></li>))}</ul>
            ) : <p className="rounded-xl border border-dashed border-border p-4 text-muted-foreground">{L ? "अभी आपका कोई परिवार नहीं है। \"+ नया परिवार\" से अपना वंश वृक्ष बनाइए — मुखिया, पूर्वज, पुत्र, पत्नी, पुत्री जोड़िए; फिर मंज़ूरी के लिए भेजिए।" : "No family yet. Use \"+ New family\" to start your tree."}</p>}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl font-semibold">🏘️ {L ? `${orgName} के परिवार` : `Families of ${orgName}`} <span className="text-sm font-normal text-muted-foreground">({dir.length})</span></h2><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L ? "परिवार, मुखिया या गाँव खोजें" : "Search"} className="w-60" /></div>
              {dir.length ? <ul className="divide-y divide-border rounded-xl border border-border">{dir.slice(0, 300).map((r) => (
                <li key={r.id}><Link to="/shok/family/$id" params={{ id: r.id }} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-secondary"><span><b>{r.family_name}</b><span className="block text-xs text-muted-foreground">{[r.head_name, r.village_name].filter(Boolean).join(" · ")}</span></span><span className="text-xs text-muted-foreground">{r.members}</span></Link></li>))}</ul>
                : <p className="text-muted-foreground">{L ? "अभी कोई मंज़ूर परिवार नहीं।" : "No approved families yet."}</p>}
            </div>
          </>
        )}
      </section>
      <NewFamilyDialog open={newOpen} onClose={() => setNewOpen(false)} L={L} onCreated={(id) => void nav({ to: "/shok/family/$id", params: { id } })} />
    </>
  );
}
