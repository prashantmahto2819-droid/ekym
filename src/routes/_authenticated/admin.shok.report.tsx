// संस्था की रिपोर्ट (वंश वृक्ष + शोक पत्र): परिवार, सदस्य, नंबर, गाँव-वार हिसाब, 90 दिन के पत्र। इससे कोई संदेश नहीं जाता।
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/_authenticated/admin/shok/report")({ component: ReportPage });

type V = { name: string; fams: number; living: number; phone: number; head_no: number };
type Lt = { created_at: string; kind: string; title: string | null; total: number; sent: number; delivered: number; read: number; failed: number };
type Rep = {
  families: { approved: number; pending: number; draft: number }; living: number; deceased: number; with_phone: number; heads_no_phone: number;
  no_whatsapp: number; suspended: number; no_head_families: number; villages: V[]; letters: Lt[]; months: { month: string; families: number; members: number }[];
};

function csv(name: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const text = "﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function ReportPage() {
  const tenant = useTenant();
  const L = useLang().lang === "hi";
  const q = useQuery({ queryKey: ["shok_report", tenant.organization_id], queryFn: async () => { const { data, error } = await sb.rpc("shok_report", { p_org: tenant.organization_id }); if (error) throw new Error(error.message); return data as Rep; } });
  const r = q.data;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const tile = (n: number, label: string, sub?: string) => (
    <div className="rounded-xl border border-border bg-card p-4"><div className="font-display text-2xl font-semibold">{n}</div><div className="text-sm">{label}</div>{sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}</div>
  );
  const KIND: Record<string, [string, string]> = { shok: ["शोकपत्र", "Condolence"], event: ["आयोजन", "Event"], notice: ["सूचना", "Notice"], other: ["अन्य", "Other"] };
  const dm = (iso: string) => new Date(iso).toLocaleDateString(L ? "hi-IN" : "en-IN");
  const th = "p-2 text-left font-medium";
  const anyRcpt = (r?.letters ?? []).some((l) => l.delivered > 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin/shok" className="text-xs text-muted-foreground hover:underline">← {L ? "शोक संदेश" : "Shok messages"}</Link>
          <h1 className="font-display text-2xl font-semibold">{L ? "रिपोर्ट" : "Report"}</h1>
          <p className="text-sm text-muted-foreground">{L ? "वंश वृक्ष, मोबाइल नंबर और भेजे गए पत्रों का हिसाब। यह सिर्फ़ देखने के लिए है — इससे किसी को कोई संदेश नहीं जाता।" : "Family trees, phone numbers and letters sent. View only — nothing is sent from here."}</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>🖨 {L ? "छापें / PDF" : "Print / PDF"}</Button>
      </header>
      {q.isLoading ? <p className="text-muted-foreground">…</p> : q.error ? <p className="text-destructive">{(q.error as Error).message}</p> : r ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tile(r.families.approved, L ? "मंज़ूर परिवार" : "Approved families", L ? `मंज़ूरी बाकी ${r.families.pending} · ड्राफ़्ट ${r.families.draft}` : `Pending ${r.families.pending} · drafts ${r.families.draft}`)}
            {tile(r.living, L ? "जीवित सदस्य" : "Living members", L ? `दिवंगत / पूर्वज ${r.deceased}` : `Deceased / ancestors ${r.deceased}`)}
            {tile(r.with_phone, L ? "नंबर दर्ज" : "With a phone number", pct(r.with_phone, r.living))}
            {tile(r.living - r.with_phone, L ? "बिना नंबर" : "Without a number", L ? `इनमें मुखिया: ${r.heads_no_phone}` : `Heads among them: ${r.heads_no_phone}`)}
            {tile(r.no_whatsapp, L ? "WhatsApp नहीं चलता" : "Not on WhatsApp", L ? `निलंबित सदस्य: ${r.suspended}` : `Suspended members: ${r.suspended}`)}
            {tile(r.no_head_families, L ? "बिना जीवित मुखिया वाले परिवार" : "Families without a living head")}
          </div>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{L ? `गाँव-वार (${r.villages.length})` : `By village (${r.villages.length})`}</h2>
              <Button size="sm" variant="outline" onClick={() => csv("village-report", L ? ["गाँव", "परिवार", "जीवित सदस्य", "नंबर दर्ज", "बिना नंबर", "बिना नंबर मुखिया"] : ["Village", "Families", "Living", "With number", "Without number", "Heads without number"], r.villages.map((v) => [v.name, v.fams, v.living, v.phone, v.living - v.phone, v.head_no]))}>⬇ Excel</Button>
            </div>
            <div className="mt-2 overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border"><tr>{(L ? ["गाँव (निवास)", "परिवार", "जीवित सदस्य", "नंबर दर्ज", "बिना नंबर", "नंबर %", "बिना नंबर मुखिया"] : ["Village (residence)", "Families", "Living", "With number", "Without", "Number %", "Heads without"]).map((t) => <th key={t} className={th}>{t}</th>)}</tr></thead>
                <tbody>{r.villages.map((v) => (
                  <tr key={v.name} className="border-b border-border/60"><td className="p-2">{v.name}</td><td className="p-2">{v.fams}</td><td className="p-2">{v.living}</td><td className="p-2">{v.phone}</td><td className="p-2 font-semibold">{v.living - v.phone}</td><td className="p-2">{pct(v.phone, v.living)}</td><td className="p-2">{v.head_no || "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{L ? `पिछले 90 दिन के पत्र व सूचनाएँ (${r.letters.length})` : `Letters and notices of the last 90 days (${r.letters.length})`}</h2>
              {r.letters.length ? <Button size="sm" variant="outline" onClick={() => csv("letters-report", L ? ["तारीख", "प्रकार", "नाम / शीर्षक", "कुल", "भेजे", "पहुँचे", "पढ़े", "असफल"] : ["Date", "Kind", "Name / title", "Total", "Sent", "Delivered", "Read", "Failed"], r.letters.map((l) => [dm(l.created_at), KIND[l.kind]?.[L ? 0 : 1] ?? l.kind, l.title ?? "", l.total, l.sent, l.delivered, l.read, l.failed]))}>⬇ Excel</Button> : null}
            </div>
            {r.letters.length ? (
              <div className="mt-2 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border"><tr>{(L ? ["तारीख", "प्रकार", "नाम / शीर्षक", "कुल", "भेजे", "पहुँचे", "पढ़े", "असफल"] : ["Date", "Kind", "Name / title", "Total", "Sent", "Delivered", "Read", "Failed"]).map((t) => <th key={t} className={th}>{t}</th>)}</tr></thead>
                  <tbody>{r.letters.map((l, i) => (
                    <tr key={i} className="border-b border-border/60"><td className="p-2 whitespace-nowrap">{dm(l.created_at)}</td><td className="p-2">{KIND[l.kind]?.[L ? 0 : 1] ?? l.kind}</td><td className="p-2">{l.title ?? "—"}</td><td className="p-2">{l.total}</td><td className="p-2">{l.sent}</td><td className="p-2">{anyRcpt ? l.delivered : "—"}</td><td className="p-2">{anyRcpt ? l.read : "—"}</td><td className={`p-2 ${l.failed ? "font-semibold text-red-700" : ""}`}>{l.failed}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="mt-2 text-sm text-muted-foreground">{L ? "इस अवधि में कोई पत्र नहीं भेजा गया।" : "No letters were sent in this period."}</p>}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold">{L ? "पिछले 6 महीने में कितना जुड़ा" : "Added in the last 6 months"}</h2>
            <table className="mt-2 w-full text-sm">
              <thead className="border-b border-border"><tr>{(L ? ["महीना", "नए परिवार", "नए नाम"] : ["Month", "New families", "New names"]).map((t) => <th key={t} className={th}>{t}</th>)}</tr></thead>
              <tbody>{r.months.map((m) => <tr key={m.month} className="border-b border-border/60"><td className="p-2">{m.month}</td><td className="p-2">{m.families}</td><td className="p-2">{m.members}</td></tr>)}</tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
