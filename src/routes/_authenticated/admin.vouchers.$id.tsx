// Voucher entry / detail: simple mode for receipt & payment (one cash/bank account + one or more heads),
// full double-entry grid for journal/contra. Posting checks balance server-side.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { dmy, h, inr, MODES, printHtml, rpc, VTYPES, type Account, type Voucher, type VoucherLine } from "@/lib/fin";

export const Route = createFileRoute("/_authenticated/admin/vouchers/$id")({ component: VoucherPage });

type Detail = Voucher & { lines: VoucherLine[]; party: { id: string; name: string; phone: string | null; address: string | null; pan: string | null } | null; fy: string | null };

function VoucherPage() {
  const { id } = Route.useParams();
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { lang } = useLang();
  const L = lang === "hi";
  const { can } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ voucher_date: string; party_name: string; mode: string; instrument_no: string; narration: string } | null>(null);
  const [lines, setLines] = useState<VoucherLine[]>([]);
  const [cashAcc, setCashAcc] = useState("");

  const detail = useQuery({ queryKey: ["fin_voucher", id], queryFn: async () => (await rpc<Detail>("fin_voucher_detail", { p_id: id })) });
  const accounts = useQuery({ queryKey: ["fin_accounts", org], queryFn: async () => { const { data } = await supabase.from("fin_accounts").select("*").eq("organization_id", org).eq("is_active", true).order("code"); return (data ?? []) as unknown as Account[]; } });
  const v = detail.data;
  const accs = (accounts.data ?? []).filter((a) => !a.is_group);
  const cashAccs = accs.filter((a) => a.is_cash || a.is_bank);
  const headAccs = accs.filter((a) => !(a.is_cash || a.is_bank));
  const simple = v?.type === "receipt" || v?.type === "payment";
  const editable = !!v && v.status === "draft" && can("fin.voucher.create");

  useEffect(() => {
    if (!v || form) return;
    setForm({ voucher_date: v.voucher_date, party_name: v.party_name ?? "", mode: v.mode ?? (v.type === "receipt" || v.type === "payment" ? "cash" : ""), instrument_no: v.instrument?.["no"] ?? v.instrument?.["txn"] ?? "", narration: v.narration ?? "" });
    if (simple) {
      const cashLine = v.lines.find((l) => cashAccs.some((a) => a.id === l.account_id));
      setCashAcc(cashLine?.account_id ?? cashAccs.find((a) => a.is_cash)?.id ?? "");
      const heads = v.lines.filter((l) => !cashAccs.some((a) => a.id === l.account_id));
      setLines(heads.length ? heads : [{ account_id: "", debit: 0, credit: 0, note: "" }]);
    } else {
      setLines(v.lines.length ? v.lines : [{ account_id: "", debit: 0, credit: 0 }, { account_id: "", debit: 0, credit: 0 }]);
    }
  }, [v, accounts.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = (l: VoucherLine) => (v?.type === "receipt" ? Number(l.credit) : v?.type === "payment" ? Number(l.debit) : 0);
  const simpleTotal = lines.reduce((s, l) => s + amount(l), 0);
  const dr = lines.reduce((s, l) => s + Number(l.debit || 0), 0), cr = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  async function save(post: boolean) {
    if (!v || !form) return;
    setBusy(true);
    try {
      let out: VoucherLine[];
      if (simple) {
        if (!cashAcc) throw new Error(L ? "नकद / बैंक खाता चुनिए" : "Choose the cash / bank account");
        const heads = lines.filter((l) => l.account_id && amount(l) > 0);
        if (!heads.length) throw new Error(L ? "कम से कम एक खाता और राशि" : "At least one head with an amount");
        const total = heads.reduce((s, l) => s + amount(l), 0);
        out = v.type === "receipt"
          ? [{ account_id: cashAcc, debit: total, credit: 0, note: null }, ...heads.map((l) => ({ account_id: l.account_id, debit: 0, credit: Number(l.credit), note: l.note ?? null }))]
          : [...heads.map((l) => ({ account_id: l.account_id, debit: Number(l.debit), credit: 0, note: l.note ?? null })), { account_id: cashAcc, debit: 0, credit: total, note: null }];
      } else {
        out = lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0)).map((l) => ({ account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0), note: l.note ?? null }));
      }
      // party: upsert by name (simple)
      let party_id = v.party_id;
      if (form.party_name.trim() && form.party_name.trim() !== (v.party_name ?? "")) {
        const { data: ex } = await supabase.from("fin_parties").select("id").eq("organization_id", org).ilike("name", form.party_name.trim()).limit(1);
        if (ex && ex.length) party_id = (ex[0] as { id: string }).id;
        else { const { data: np, error } = await supabase.from("fin_parties").insert({ organization_id: org, name: form.party_name.trim(), kind: v.type === "payment" ? "vendor" : "donor" } as never).select("id").single(); if (error) throw error; party_id = (np as { id: string }).id; }
      }
      const { error: e1 } = await supabase.from("fin_vouchers").update({ voucher_date: form.voucher_date, party_id, party_name: form.party_name.trim() || null, mode: form.mode || null, instrument: form.instrument_no ? { no: form.instrument_no } : {}, narration: form.narration || null, amount: simple ? simpleTotal : dr } as never).eq("id", id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("fin_lines").delete().eq("voucher_id", id); if (e2) throw e2;
      const { error: e3 } = await supabase.from("fin_lines").insert(out.map((l, i) => ({ voucher_id: id, organization_id: org, account_id: l.account_id, debit: l.debit, credit: l.credit, note: l.note, sort_order: i })) as never); if (e3) throw e3;
      if (post) { const r = await rpc<{ number: string }>("fin_post_voucher", { p_id: id }); toast.success(`${L ? "Post हुआ" : "Posted"}: ${r.number}`); }
      else toast.success(L ? "ड्राफ़्ट सहेजा" : "Draft saved");
      setForm(null); qc.invalidateQueries({ queryKey: ["fin_voucher", id] }); qc.invalidateQueries({ queryKey: ["fin_vouchers"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!v) return;
    const reason = v.status === "draft" ? "draft" : prompt(L ? "रद्द करने का कारण" : "Reason for cancellation");
    if (!reason) return;
    try { await rpc("fin_cancel_voucher", { p_id: id, p_reason: reason }); toast.success(L ? "रद्द" : "Cancelled"); qc.invalidateQueries({ queryKey: ["fin_vouchers"] }); if (v.status === "draft") nav({ to: "/admin/vouchers" }); else qc.invalidateQueries({ queryKey: ["fin_voucher", id] }); } catch (e) { toast.error((e as Error).message); }
  }
  async function reverse() {
    const d = prompt(L ? "Reversal की तारीख (YYYY-MM-DD)" : "Reversal date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10)); if (!d) return;
    try { const nid = await rpc<string>("fin_reverse_voucher", { p_id: id, p_date: d, p_reason: null }); toast.success(L ? "Reversal बना" : "Reversal created"); nav({ to: "/admin/vouchers/$id", params: { id: nid } }); } catch (e) { toast.error((e as Error).message); }
  }
  async function receipt() {
    try { const did = await rpc<string>("fin_receipt_document", { p_voucher: id }); nav({ to: "/admin/letters/$id", params: { id: did } }); } catch (e) { toast.error((e as Error).message); }
  }
  function print() {
    if (!v) return;
    const rows = v.lines.map((l) => `<tr><td>${h(l.code)} ${h(L && l.account_hi ? l.account_hi : l.account)}${l.note ? `<br><small>${h(l.note)}</small>` : ""}</td><td class="num">${l.debit ? inr(l.debit) : ""}</td><td class="num">${l.credit ? inr(l.credit) : ""}</td></tr>`).join("");
    printHtml(`${v.number ?? "Draft"}`, `<h1>${h(tenant.name)}</h1><h2>${h(VTYPES[v.type].en)} voucher ${h(v.number ?? "(draft)")} · ${dmy(v.voucher_date)}${v.fy ? ` · FY ${h(v.fy)}` : ""}</h2>
      <p>${v.party_name ? `<b>${h(v.party_name)}</b><br>` : ""}${v.mode ? `Mode: ${h(v.mode)} ${h(v.instrument?.["no"] ?? v.instrument?.["txn"] ?? "")}<br>` : ""}${h(v.narration ?? "")}</p>
      <table><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>${rows}<tr class="total"><td>Total</td><td class="num">${inr(v.amount)}</td><td class="num">${inr(v.amount)}</td></tr></tbody></table>
      <p style="margin-top:40px">Prepared by ____________ &nbsp;&nbsp;&nbsp; Checked by ____________ &nbsp;&nbsp;&nbsp; Approved by ____________</p>${v.status === "cancelled" ? `<p style="color:#b91c1c"><b>CANCELLED</b> — ${h(v.cancel_reason)}</p>` : ""}`);
  }

  if (detail.error) return <p className="text-sm text-destructive">{(detail.error as Error).message}</p>;
  if (!v || !form) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const acc = (idd: string) => accs.find((a) => a.id === idd);
  const accLabel = (a: Account) => `${a.code} · ${L && a.name_hi ? a.name_hi : a.name}`;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground"><Link to="/admin/vouchers" className="hover:underline">{L ? "वाउचर" : "Vouchers"}</Link> · {L ? VTYPES[v.type].hi : VTYPES[v.type].en}</p>
          <h1 className="font-display text-xl font-semibold">{v.number ?? (L ? "ड्राफ़्ट" : "Draft")} <Badge className="ml-2 align-middle" variant={v.status === "posted" ? "default" : v.status === "cancelled" ? "destructive" : "secondary"}>{v.status}</Badge>{v.source !== "manual" ? <Badge variant="outline" className="ml-1 align-middle">{v.source}</Badge> : null}</h1>
          {v.cancel_reason ? <p className="text-xs text-destructive">{v.cancel_reason}</p> : null}
          {v.reversed_by ? <p className="text-xs text-muted-foreground">{L ? "Reversal बन चुका है" : "Reversed"}: <Link to="/admin/vouchers/$id" params={{ id: v.reversed_by }} className="underline">{L ? "देखें" : "view"}</Link></p> : null}
          {v.reversal_of ? <p className="text-xs text-muted-foreground">{L ? "यह reversal है" : "Reversal of"}: <Link to="/admin/vouchers/$id" params={{ id: v.reversal_of }} className="underline">{L ? "मूल वाउचर" : "original"}</Link></p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {editable ? <><Button size="sm" variant="outline" onClick={() => save(false)} disabled={busy}>{L ? "ड्राफ़्ट सहेजें" : "Save draft"}</Button><Button size="sm" onClick={() => save(true)} disabled={busy}>{L ? "Post करें (नंबर दें)" : "Post (assign number)"}</Button></> : null}
          {v.status === "posted" && v.type === "receipt" && can("fin.voucher.create") ? <Button size="sm" onClick={receipt}>{v.document_id ? (L ? "रसीद खोलें" : "Open receipt") : (L ? "रसीद बनाएँ (PDF/WhatsApp)" : "Make receipt (PDF/WhatsApp)")}</Button> : null}
          <Button size="sm" variant="outline" onClick={print}>{L ? "प्रिंट" : "Print"}</Button>
          {v.status === "posted" && can("fin.voucher.cancel") ? <><Button size="sm" variant="ghost" onClick={reverse} disabled={!!v.reversed_by}>{L ? "Reversal" : "Reverse"}</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={cancel}>{L ? "रद्द करें" : "Cancel"}</Button></> : null}
          {v.status === "draft" && can("fin.voucher.create") ? <Button size="sm" variant="ghost" className="text-destructive" onClick={cancel}>{L ? "ड्राफ़्ट हटाएँ" : "Delete draft"}</Button> : null}
        </div>
      </div>

      <fieldset disabled={!editable} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <L1 label={L ? "तारीख" : "Date"}><Input type="date" value={form.voucher_date} onChange={(e) => setForm({ ...form, voucher_date: e.target.value })} /></L1>
        <L1 label={v.type === "payment" ? (L ? "किसे भुगतान" : "Paid to") : (L ? "किससे प्राप्त / पक्ष" : "Received from / party")}><Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} /></L1>
        {simple ? <L1 label={L ? "नकद / बैंक खाता" : "Cash / bank account"}><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={cashAcc} onChange={(e) => setCashAcc(e.target.value)}><option value="">—</option>{cashAccs.map((a) => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}</select></L1> : null}
        <L1 label={L ? "माध्यम / संदर्भ" : "Mode / reference"}><div className="flex gap-1"><select className="h-9 rounded-md border border-input bg-background px-2" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option value="">—</option>{MODES.map((m) => <option key={m} value={m}>{m}</option>)}</select><Input placeholder={L ? "चेक/UPI/Txn नंबर" : "Cheque/UPI/Txn no."} value={form.instrument_no} onChange={(e) => setForm({ ...form, instrument_no: e.target.value })} /></div></L1>
        <div className="sm:col-span-2 lg:col-span-4"><L1 label={L ? "विवरण (narration)" : "Narration"}><Textarea rows={2} value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} /></L1></div>
      </fieldset>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr><th className="p-2">{L ? "खाता (मद)" : "Account (head)"}</th>{simple ? <th className="p-2 text-right w-40">{L ? "राशि" : "Amount"}</th> : <><th className="p-2 text-right w-36">{L ? "डेबिट" : "Debit"}</th><th className="p-2 text-right w-36">{L ? "क्रेडिट" : "Credit"}</th></>}<th className="p-2">{L ? "टिप्पणी" : "Note"}</th><th className="w-10"></th></tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-1">{editable ? <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={l.account_id} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, account_id: e.target.value } : x)))}><option value="">—</option>{(simple ? headAccs : accs).map((a) => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}</select> : <span>{acc(l.account_id) ? accLabel(acc(l.account_id)!) : `${l.code ?? ""} ${l.account ?? ""}`}</span>}</td>
                {simple ? (
                  <td className="p-1"><Input type="number" step="0.01" className="text-right" value={amount(l) || ""} disabled={!editable} onChange={(e) => { const n = Number(e.target.value); setLines(lines.map((x, j) => (j === i ? { ...x, debit: v.type === "payment" ? n : 0, credit: v.type === "receipt" ? n : 0 } : x))); }} /></td>
                ) : (<>
                  <td className="p-1"><Input type="number" step="0.01" className="text-right" value={l.debit || ""} disabled={!editable} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, debit: Number(e.target.value), credit: 0 } : x)))} /></td>
                  <td className="p-1"><Input type="number" step="0.01" className="text-right" value={l.credit || ""} disabled={!editable} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, credit: Number(e.target.value), debit: 0 } : x)))} /></td>
                </>)}
                <td className="p-1"><Input value={l.note ?? ""} disabled={!editable} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} /></td>
                <td className="p-1">{editable && lines.length > 1 ? <Button size="sm" variant="ghost" onClick={() => setLines(lines.filter((_, j) => j !== i))}>×</Button> : null}</td>
              </tr>
            ))}
            <tr className="border-t border-border bg-secondary/30 font-semibold">
              <td className="p-2">{editable ? <Button size="sm" variant="ghost" onClick={() => setLines([...lines, { account_id: "", debit: 0, credit: 0, note: "" }])}>+ {L ? "पंक्ति" : "line"}</Button> : (L ? "कुल" : "Total")}</td>
              {simple ? <td className="p-2 text-right tabular-nums">{inr(simpleTotal)}</td> : <><td className="p-2 text-right tabular-nums">{inr(dr)}</td><td className={`p-2 text-right tabular-nums ${dr !== cr ? "text-destructive" : ""}`}>{inr(cr)}</td></>}
              <td className="p-2 text-xs font-normal text-muted-foreground" colSpan={2}>{!simple && dr !== cr ? (L ? "डेबिट और क्रेडिट बराबर होने चाहिए" : "Debit and credit must match") : simple ? (v.type === "receipt" ? (L ? `${cashAcc ? accLabel(acc(cashAcc)!) : "नकद/बैंक"} में जमा; मद खातों में क्रेडिट` : "Debit cash/bank; credit the heads") : (L ? "मद खातों में डेबिट; नकद/बैंक से भुगतान" : "Debit the heads; credit cash/bank")) : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {v.status === "posted" ? <p className="text-xs text-muted-foreground">{L ? "Posted वाउचर बदला नहीं जा सकता; गलती हो तो रद्द करें (कारण के साथ) या reversal बनाएँ।" : "Posted vouchers cannot be edited; cancel with a reason or create a reversal."}</p> : null}
    </div>
  );
}

function L1({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
