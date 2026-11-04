// Books & reports: cash/bank book, ledger, trial balance, income & expenditure, receipts & payments. CSV + print (PDF).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";
import { dmy, downloadCsv, fyBounds, h, inr, printHtml, rpc, type Account } from "@/lib/fin";

export const Route = createFileRoute("/_authenticated/admin/reports")({ component: ReportsPage });

type Tab = "cashbook" | "ledger" | "tb" | "ie" | "rp";
type TB = { account_id: string; code: string; name: string; name_hi: string | null; type: Account["type"]; parent_id: string | null; is_group: boolean; opening: number; debit: number; credit: number; closing: number };
type Led = { voucher_id: string | null; voucher_date: string; number: string; type: string; party_name: string | null; narration: string | null; debit: number; credit: number; balance: number };
type CB = { voucher_id: string; voucher_date: string; number: string; type: string; account_name: string; party_name: string | null; narration: string | null; receipt: number; payment: number };
type RP = { side: "receipt" | "payment"; account_id: string; code: string; name: string; name_hi: string | null; amount: number };

function ReportsPage() {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { lang } = useLang();
  const L = lang === "hi";
  const fy = fyBounds();
  const [tab, setTab] = useState<Tab>("cashbook");
  const [from, setFrom] = useState(fy.from);
  const [to, setTo] = useState(fy.to);
  const [account, setAccount] = useState("");
  const nm = (r: { name: string; name_hi: string | null }) => (L && r.name_hi ? r.name_hi : r.name);

  const accounts = useQuery({ queryKey: ["fin_accounts", org], queryFn: async () => { const { data } = await supabase.from("fin_accounts").select("*").eq("organization_id", org).order("code"); return (data ?? []) as unknown as Account[]; } });
  const tb = useQuery({ queryKey: ["fin_tb", org, from, to], enabled: tab === "tb" || tab === "ie", queryFn: () => rpc<TB[]>("fin_trial_balance", { p_org: org, p_from: from, p_to: to }) });
  const cb = useQuery({ queryKey: ["fin_cb", org, from, to, account], enabled: tab === "cashbook", queryFn: () => rpc<CB[]>("fin_cashbook", { p_org: org, p_from: from, p_to: to, p_account: account || null }) });
  const led = useQuery({ queryKey: ["fin_led", account, from, to], enabled: tab === "ledger" && !!account, queryFn: () => rpc<Led[]>("fin_ledger", { p_account: account, p_from: from, p_to: to }) });
  const rp = useQuery({ queryKey: ["fin_rp", org, from, to], enabled: tab === "rp", queryFn: () => rpc<RP[]>("fin_receipts_payments", { p_org: org, p_from: from, p_to: to }) });

  const TABS: [Tab, string, string][] = [["cashbook", "Cash / bank book", "रोकड़ / बैंक बही"], ["ledger", "Ledger", "खाता बही"], ["tb", "Trial balance", "तलपट"], ["ie", "Income & expenditure", "आय-व्यय"], ["rp", "Receipts & payments", "प्राप्ति-भुगतान"]];
  const period = `${dmy(from)} – ${dmy(to)}`;
  const head = (title: string) => `<h1>${h(tenant.name)}</h1><h2>${h(title)} · ${period}</h2>`;

  // ---- derived: I&E ----
  const tbRows = (tb.data ?? []).filter((r) => !r.is_group);
  const income = tbRows.filter((r) => r.type === "income").map((r) => ({ ...r, amt: r.credit - r.debit })).filter((r) => r.amt !== 0);
  const expense = tbRows.filter((r) => r.type === "expense").map((r) => ({ ...r, amt: r.debit - r.credit })).filter((r) => r.amt !== 0);
  const incT = income.reduce((s, r) => s + r.amt, 0), expT = expense.reduce((s, r) => s + r.amt, 0);
  const tbDr = tbRows.reduce((s, r) => s + (r.closing > 0 ? r.closing : 0), 0), tbCr = tbRows.reduce((s, r) => s + (r.closing < 0 ? -r.closing : 0), 0);
  const rpR = (rp.data ?? []).filter((r) => r.side === "receipt"), rpP = (rp.data ?? []).filter((r) => r.side === "payment");
  const cashOpen = (tb.data ?? []).filter((r) => r.is_group === false && accounts.data?.find((a) => a.id === r.account_id && (a.is_cash || a.is_bank)));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">{L ? "बही-खाते व रिपोर्ट" : "Books & reports"}</h1>
        <p className="text-sm text-muted-foreground">{L ? "सिर्फ़ posted वाउचर गिने जाते हैं। CSV Excel में खुलता है; प्रिंट से PDF सहेजें।" : "Only posted vouchers count. CSV opens in Excel; use Print to save a PDF."} <Link to="/admin/vouchers" className="underline">{L ? "वाउचर" : "Vouchers"}</Link> · <Link to="/admin/accounts" className="underline">{L ? "खाते" : "Accounts"}</Link></p>
      </header>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex rounded-md border border-border p-0.5 text-xs">{TABS.map(([k, en, hi]) => <button key={k} type="button" className={`rounded px-2 py-1 ${tab === k ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setTab(k)}>{L ? hi : en}</button>)}</div>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /> – <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        {(tab === "ledger" || tab === "cashbook") ? (
          <select className="h-9 rounded-md border border-input bg-background px-2" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">{tab === "cashbook" ? (L ? "सभी नकद/बैंक" : "All cash/bank") : (L ? "— खाता चुनें —" : "— choose account —")}</option>
            {(accounts.data ?? []).filter((a) => !a.is_group && (tab === "ledger" || a.is_cash || a.is_bank)).map((a) => <option key={a.id} value={a.id}>{a.code} · {nm(a)}</option>)}
          </select>
        ) : null}
      </div>

      {tab === "cashbook" ? (
        <Report title={L ? "रोकड़ / बैंक बही" : "Cash / bank book"} L={L}
          onCsv={() => downloadCsv(`cashbook-${from}-${to}.csv`, ["Date", "No.", "Account", "Party", "Narration", "Receipt", "Payment"], (cb.data ?? []).map((r) => [dmy(r.voucher_date), r.number, r.account_name, r.party_name, r.narration, r.receipt, r.payment]))}
          onPrint={() => printHtml("Cash book", head("Cash / bank book") + table(["Date", "No.", "Account", "Party / narration", "Receipt", "Payment"], (cb.data ?? []).map((r) => [dmy(r.voucher_date), r.number, r.account_name, `${r.party_name ?? ""} ${r.narration ?? ""}`, inr(r.receipt), inr(r.payment)]), [4, 5]))}>
          <table className="w-full text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "तारीख" : "Date"}</th><th className="p-2">{L ? "नंबर" : "No."}</th><th className="p-2">{L ? "खाता" : "Account"}</th><th className="p-2">{L ? "पक्ष / विवरण" : "Party / narration"}</th><th className="p-2 text-right">{L ? "प्राप्ति" : "Receipt"}</th><th className="p-2 text-right">{L ? "भुगतान" : "Payment"}</th></tr></thead>
            <tbody>{(cb.data ?? []).map((r, i) => <tr key={i} className="border-t border-border"><td className="p-2">{dmy(r.voucher_date)}</td><td className="p-2 font-mono text-xs"><Link to="/admin/vouchers/$id" params={{ id: r.voucher_id }} className="underline">{r.number}</Link></td><td className="p-2">{r.account_name}</td><td className="p-2">{r.party_name ? <b>{r.party_name}</b> : null} <span className="text-muted-foreground">{r.narration}</span></td><td className="p-2 text-right tabular-nums">{r.receipt ? inr(r.receipt) : ""}</td><td className="p-2 text-right tabular-nums">{r.payment ? inr(r.payment) : ""}</td></tr>)}
              <tr className="border-t border-border bg-secondary/30 font-semibold"><td className="p-2" colSpan={4}>{L ? "कुल" : "Total"}</td><td className="p-2 text-right">{inr((cb.data ?? []).reduce((s, r) => s + Number(r.receipt), 0))}</td><td className="p-2 text-right">{inr((cb.data ?? []).reduce((s, r) => s + Number(r.payment), 0))}</td></tr></tbody></table>
        </Report>
      ) : null}

      {tab === "ledger" ? (
        <Report title={L ? "खाता बही" : "Ledger"} L={L} onCsv={() => downloadCsv(`ledger-${from}-${to}.csv`, ["Date", "No.", "Party", "Narration", "Debit", "Credit", "Balance"], (led.data ?? []).map((r) => [dmy(r.voucher_date), r.number, r.party_name, r.narration, r.debit, r.credit, r.balance]))}
          onPrint={() => printHtml("Ledger", head(`Ledger: ${accounts.data?.find((a) => a.id === account)?.name ?? ""}`) + table(["Date", "No.", "Party / narration", "Debit", "Credit", "Balance"], (led.data ?? []).map((r) => [dmy(r.voucher_date), r.number, `${r.party_name ?? ""} ${r.narration ?? ""}`, inr(r.debit), inr(r.credit), inr(r.balance)]), [3, 4, 5]))}>
          {!account ? <p className="p-3 text-sm text-muted-foreground">{L ? "ऊपर खाता चुनिए।" : "Choose an account above."}</p> : (
            <table className="w-full text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "तारीख" : "Date"}</th><th className="p-2">{L ? "नंबर" : "No."}</th><th className="p-2">{L ? "पक्ष / विवरण" : "Party / narration"}</th><th className="p-2 text-right">{L ? "डेबिट" : "Debit"}</th><th className="p-2 text-right">{L ? "क्रेडिट" : "Credit"}</th><th className="p-2 text-right">{L ? "शेष" : "Balance"}</th></tr></thead>
              <tbody>{(led.data ?? []).map((r, i) => <tr key={i} className={`border-t border-border ${!r.voucher_id ? "bg-secondary/30 italic" : ""}`}><td className="p-2">{dmy(r.voucher_date)}</td><td className="p-2 font-mono text-xs">{r.voucher_id ? <Link to="/admin/vouchers/$id" params={{ id: r.voucher_id }} className="underline">{r.number}</Link> : r.number}</td><td className="p-2">{r.party_name ? <b>{r.party_name}</b> : null} <span className="text-muted-foreground">{r.narration}</span></td><td className="p-2 text-right tabular-nums">{r.debit ? inr(r.debit) : ""}</td><td className="p-2 text-right tabular-nums">{r.credit ? inr(r.credit) : ""}</td><td className="p-2 text-right tabular-nums">{inr(Math.abs(r.balance))} {r.balance < 0 ? "Cr" : "Dr"}</td></tr>)}</tbody></table>
          )}
        </Report>
      ) : null}

      {tab === "tb" ? (
        <Report title={L ? "तलपट" : "Trial balance"} L={L} onCsv={() => downloadCsv(`trial-balance-${to}.csv`, ["Code", "Account", "Type", "Opening", "Debit", "Credit", "Closing Dr", "Closing Cr"], tbRows.map((r) => [r.code, nm(r), r.type, r.opening, r.debit, r.credit, r.closing > 0 ? r.closing : 0, r.closing < 0 ? -r.closing : 0]))}
          onPrint={() => printHtml("Trial balance", head("Trial balance") + table(["Code", "Account", "Debit", "Credit"], [...tbRows.map((r) => [r.code, nm(r), r.closing > 0 ? inr(r.closing) : "", r.closing < 0 ? inr(-r.closing) : ""]), ["", "Total", inr(tbDr), inr(tbCr)]], [2, 3]))}>
          <table className="w-full text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "कोड" : "Code"}</th><th className="p-2">{L ? "खाता" : "Account"}</th><th className="p-2 text-right">{L ? "प्रारंभिक" : "Opening"}</th><th className="p-2 text-right">{L ? "डेबिट" : "Debit"}</th><th className="p-2 text-right">{L ? "क्रेडिट" : "Credit"}</th><th className="p-2 text-right">{L ? "शेष Dr" : "Closing Dr"}</th><th className="p-2 text-right">{L ? "शेष Cr" : "Closing Cr"}</th></tr></thead>
            <tbody>{tbRows.map((r) => <tr key={r.account_id} className="border-t border-border"><td className="p-2 font-mono text-xs">{r.code}</td><td className="p-2">{nm(r)}</td><td className="p-2 text-right tabular-nums">{inr(r.opening)}</td><td className="p-2 text-right tabular-nums">{inr(r.debit)}</td><td className="p-2 text-right tabular-nums">{inr(r.credit)}</td><td className="p-2 text-right tabular-nums">{r.closing > 0 ? inr(r.closing) : ""}</td><td className="p-2 text-right tabular-nums">{r.closing < 0 ? inr(-r.closing) : ""}</td></tr>)}
              <tr className={`border-t border-border bg-secondary/30 font-semibold ${Math.abs(tbDr - tbCr) > 0.005 ? "text-destructive" : ""}`}><td className="p-2" colSpan={5}>{L ? "कुल" : "Total"} {Math.abs(tbDr - tbCr) > 0.005 ? (L ? "(बराबर नहीं — प्रारंभिक शेष जाँचें)" : "(not balanced — check opening balances)") : ""}</td><td className="p-2 text-right">{inr(tbDr)}</td><td className="p-2 text-right">{inr(tbCr)}</td></tr></tbody></table>
        </Report>
      ) : null}

      {tab === "ie" ? (
        <Report title={L ? "आय-व्यय विवरण" : "Income & expenditure"} L={L} onCsv={() => downloadCsv(`income-expenditure-${from}-${to}.csv`, ["Side", "Code", "Account", "Amount"], [...income.map((r) => ["Income", r.code, nm(r), r.amt]), ...expense.map((r) => ["Expenditure", r.code, nm(r), r.amt]), ["", "", incT >= expT ? "Surplus" : "Deficit", Math.abs(incT - expT)]])}
          onPrint={() => printHtml("Income & expenditure", head("Income & expenditure account") + `<div style="display:flex;gap:16px"><div style="flex:1">${table(["Expenditure", "Amount"], [...expense.map((r) => [nm(r), inr(r.amt)]), ["Total", inr(expT)]], [1])}</div><div style="flex:1">${table(["Income", "Amount"], [...income.map((r) => [nm(r), inr(r.amt)]), ["Total", inr(incT)]], [1])}</div></div><p><b>${incT >= expT ? "Surplus" : "Deficit"}: ${inr(Math.abs(incT - expT))}</b></p>`)}>
          <div className="grid gap-4 p-3 md:grid-cols-2 text-sm">
            <div><h3 className="mb-1 font-semibold">{L ? "व्यय" : "Expenditure"}</h3><table className="w-full"><tbody>{expense.map((r) => <tr key={r.account_id} className="border-t border-border"><td className="p-1">{nm(r)}</td><td className="p-1 text-right tabular-nums">{inr(r.amt)}</td></tr>)}<tr className="border-t border-border font-semibold"><td className="p-1">{L ? "कुल" : "Total"}</td><td className="p-1 text-right">{inr(expT)}</td></tr></tbody></table></div>
            <div><h3 className="mb-1 font-semibold">{L ? "आय" : "Income"}</h3><table className="w-full"><tbody>{income.map((r) => <tr key={r.account_id} className="border-t border-border"><td className="p-1">{nm(r)}</td><td className="p-1 text-right tabular-nums">{inr(r.amt)}</td></tr>)}<tr className="border-t border-border font-semibold"><td className="p-1">{L ? "कुल" : "Total"}</td><td className="p-1 text-right">{inr(incT)}</td></tr></tbody></table></div>
            <p className="md:col-span-2 font-semibold">{incT >= expT ? (L ? "अधिशेष (बचत)" : "Surplus") : (L ? "घाटा" : "Deficit")}: {inr(Math.abs(incT - expT))}</p>
          </div>
        </Report>
      ) : null}

      {tab === "rp" ? (
        <Report title={L ? "प्राप्ति-भुगतान खाता" : "Receipts & payments"} L={L} onCsv={() => downloadCsv(`receipts-payments-${from}-${to}.csv`, ["Side", "Code", "Account", "Amount"], (rp.data ?? []).map((r) => [r.side, r.code, nm(r), r.amount]))}
          onPrint={() => printHtml("Receipts & payments", head("Receipts & payments account") + `<div style="display:flex;gap:16px"><div style="flex:1">${table(["Receipts", "Amount"], [...cashOpen.map((r) => [`Opening: ${nm(r)}`, inr(r.opening)]), ...rpR.map((r) => [nm(r), inr(r.amount)])], [1])}</div><div style="flex:1">${table(["Payments", "Amount"], [...rpP.map((r) => [nm(r), inr(r.amount)]), ...cashOpen.map((r) => [`Closing: ${nm(r)}`, inr(r.closing)])], [1])}</div></div>`)}>
          <div className="grid gap-4 p-3 md:grid-cols-2 text-sm">
            <div><h3 className="mb-1 font-semibold">{L ? "प्राप्तियाँ" : "Receipts"}</h3><table className="w-full"><tbody>{cashOpen.map((r) => <tr key={r.account_id} className="border-t border-border italic"><td className="p-1">{L ? "प्रारंभिक" : "Opening"}: {nm(r)}</td><td className="p-1 text-right tabular-nums">{inr(r.opening)}</td></tr>)}{rpR.map((r) => <tr key={r.account_id} className="border-t border-border"><td className="p-1">{nm(r)}</td><td className="p-1 text-right tabular-nums">{inr(r.amount)}</td></tr>)}</tbody></table></div>
            <div><h3 className="mb-1 font-semibold">{L ? "भुगतान" : "Payments"}</h3><table className="w-full"><tbody>{rpP.map((r) => <tr key={r.account_id} className="border-t border-border"><td className="p-1">{nm(r)}</td><td className="p-1 text-right tabular-nums">{inr(r.amount)}</td></tr>)}{cashOpen.map((r) => <tr key={r.account_id} className="border-t border-border italic"><td className="p-1">{L ? "अंतिम" : "Closing"}: {nm(r)}</td><td className="p-1 text-right tabular-nums">{inr(r.closing)}</td></tr>)}</tbody></table></div>
          </div>
        </Report>
      ) : null}
    </div>
  );
}

function Report({ title, L, onCsv, onPrint, children }: { title: string; L: boolean; onCsv: () => void; onPrint: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border p-2"><h2 className="font-display font-semibold">{title}</h2><div className="flex gap-1"><Button size="sm" variant="outline" onClick={onCsv}>CSV / Excel</Button><Button size="sm" variant="outline" onClick={onPrint}>{L ? "प्रिंट / PDF" : "Print / PDF"}</Button></div></div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function table(headers: string[], rows: (string | number | null | undefined)[][], numCols: number[] = []) {
  const th = headers.map((x, i) => `<th class="${numCols.includes(i) ? "num" : ""}">${h(x)}</th>`).join("");
  const tr = rows.map((r, ri) => `<tr class="${ri === rows.length - 1 && String(r[0] ?? "").startsWith("Total") || String(r[1] ?? "") === "Total" ? "total" : ""}">${r.map((c, i) => `<td class="${numCols.includes(i) ? "num" : ""}">${h(c)}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}
