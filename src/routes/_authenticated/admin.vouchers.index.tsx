import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { dmy, downloadCsv, fyBounds, inr, rpc, VTYPES, type Voucher } from "@/lib/fin";

export const Route = createFileRoute("/_authenticated/admin/vouchers/")({ component: VouchersList });

function VouchersList() {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { lang } = useLang();
  const L = lang === "hi";
  const { can } = useAuth();
  const nav = useNavigate();
  const fy = fyBounds();
  const [from, setFrom] = useState(fy.from);
  const [to, setTo] = useState(fy.to);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: ["fin_vouchers", org, from, to, type, status],
    queryFn: async () => {
      let qb = supabase.from("fin_vouchers").select("*").eq("organization_id", org).gte("voucher_date", from).lte("voucher_date", to).order("voucher_date", { ascending: false }).order("created_at", { ascending: false }).limit(500);
      if (type) qb = qb.eq("type", type);
      if (status) qb = qb.eq("status", status);
      const { data, error } = await qb; if (error) throw error; return (data ?? []) as unknown as Voucher[];
    },
  });
  const rows = (list.data ?? []).filter((v) => !q || [v.number, v.party_name, v.narration].some((t) => (t ?? "").toLowerCase().includes(q.toLowerCase())));

  async function newVoucher(t: Voucher["type"]) {
    setBusy(true);
    try {
      const { data, error } = await supabase.from("fin_vouchers").insert({ organization_id: org, type: t, voucher_date: new Date().toISOString().slice(0, 10), created_by: (await supabase.auth.getUser()).data.user?.id } as never).select("id").single();
      if (error) throw error;
      nav({ to: "/admin/vouchers/$id", params: { id: (data as { id: string }).id } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function importDonations() {
    setBusy(true);
    try { const n = await rpc<number>("fin_import_paid_donations", { p_org: org }); toast.success(`${n} ${L ? "दान के वाउचर बने" : "donation vouchers created"}`); list.refetch(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const totals = rows.reduce((a, v) => { if (v.status === "posted") { if (v.type === "receipt") a.r += Number(v.amount); if (v.type === "payment") a.p += Number(v.amount); } return a; }, { r: 0, p: 0 });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{L ? "वाउचर" : "Vouchers"}</h1>
          <p className="text-sm text-muted-foreground">{L ? "प्राप्ति (रसीद), भुगतान, जर्नल और कॉन्ट्रा। Post करने पर नंबर मिलता है; गलती पर रद्द या reversal।" : "Receipts, payments, journal and contra entries. Posting assigns the number; mistakes are cancelled or reversed."}</p>
        </div>
        {can("fin.voucher.create") ? (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(VTYPES) as Voucher["type"][]).map((t) => <Button key={t} size="sm" variant={t === "receipt" ? "default" : "outline"} onClick={() => newVoucher(t)} disabled={busy}>+ {L ? VTYPES[t].hi : VTYPES[t].en}</Button>)}
            <Button size="sm" variant="ghost" onClick={importDonations} disabled={busy} title={L ? "Razorpay से मिले दान के वाउचर अपने आप बनाएँ" : "Create vouchers for paid online donations"}>{L ? "ऑनलाइन दान लाएँ" : "Import online donations"}</Button>
          </div>
        ) : null}
      </header>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /> – <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        <select className="h-9 rounded-md border border-input bg-background px-2" value={type} onChange={(e) => setType(e.target.value)}><option value="">{L ? "सभी प्रकार" : "All types"}</option>{(Object.keys(VTYPES) as Voucher["type"][]).map((t) => <option key={t} value={t}>{L ? VTYPES[t].hi : VTYPES[t].en}</option>)}</select>
        <select className="h-9 rounded-md border border-input bg-background px-2" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{L ? "सभी स्थिति" : "All statuses"}</option>{["draft", "posted", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <Input placeholder={L ? "नंबर / नाम / विवरण" : "No. / party / narration"} value={q} onChange={(e) => setQ(e.target.value)} className="w-52" />
        <Button size="sm" variant="outline" onClick={() => downloadCsv(`vouchers-${from}-${to}.csv`, ["Date", "Number", "Type", "Party", "Mode", "Narration", "Amount", "Status"], rows.map((v) => [dmy(v.voucher_date), v.number, v.type, v.party_name, v.mode, v.narration, v.amount, v.status]))}>CSV</Button>
        <span className="ml-auto text-xs text-muted-foreground">{L ? "प्राप्ति" : "Receipts"} {inr(totals.r)} · {L ? "भुगतान" : "Payments"} {inr(totals.p)}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "तारीख" : "Date"}</th><th className="p-2">{L ? "नंबर" : "No."}</th><th className="p-2">{L ? "प्रकार" : "Type"}</th><th className="p-2">{L ? "पक्ष / विवरण" : "Party / narration"}</th><th className="p-2 text-right">{L ? "राशि" : "Amount"}</th><th className="p-2">{L ? "स्थिति" : "Status"}</th></tr></thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="cursor-pointer border-t border-border hover:bg-secondary/40" onClick={() => nav({ to: "/admin/vouchers/$id", params: { id: v.id } })}>
                <td className="p-2 whitespace-nowrap">{dmy(v.voucher_date)}</td>
                <td className="p-2 font-mono text-xs">{v.number ?? "—"}</td>
                <td className="p-2 text-xs">{L ? VTYPES[v.type].hi : VTYPES[v.type].en}{v.source !== "manual" ? <span className="ml-1 text-muted-foreground">({v.source})</span> : null}</td>
                <td className="p-2">{v.party_name ? <b>{v.party_name}</b> : null}{v.party_name && v.narration ? " · " : ""}<span className="text-muted-foreground">{v.narration}</span></td>
                <td className="p-2 text-right tabular-nums">{inr(v.amount)}</td>
                <td className="p-2"><Badge variant={v.status === "posted" ? "default" : v.status === "cancelled" ? "destructive" : "secondary"}>{v.status}</Badge></td>
              </tr>
            ))}
            {list.isSuccess && !rows.length ? <tr><td className="p-3 text-muted-foreground" colSpan={6}>{L ? "इस अवधि में कोई वाउचर नहीं।" : "No vouchers in this period."} <Link to="/admin/accounts" className="underline">{L ? "खाते देखें" : "Accounts"}</Link></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
