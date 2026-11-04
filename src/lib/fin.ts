// Accounting helpers shared by the finance pages.
import { supabase } from "@/integrations/supabase/client";

export type Account = { id: string; code: string; name: string; name_hi: string | null; type: "asset" | "liability" | "income" | "expense" | "equity"; parent_id: string | null; is_group: boolean; is_cash: boolean; is_bank: boolean; opening_balance: number; is_active: boolean; sort_order: number };
export type FinYear = { id: string; label: string; starts_on: string; ends_on: string; locked: boolean };
export type Voucher = { id: string; type: "receipt" | "payment" | "journal" | "contra"; number: string | null; voucher_date: string; party_id: string | null; party_name: string | null; mode: string | null; instrument: Record<string, string>; narration: string | null; amount: number; status: "draft" | "posted" | "cancelled"; source: string; source_id: string | null; reversal_of: string | null; reversed_by: string | null; cancel_reason: string | null; document_id: string | null; fy_id: string | null; created_at: string; posted_at: string | null };
export type VoucherLine = { id?: string; account_id: string; debit: number; credit: number; note?: string | null; code?: string; account?: string; account_hi?: string | null };

export const VTYPES: Record<Voucher["type"], { en: string; hi: string }> = {
  receipt: { en: "Receipt", hi: "प्राप्ति (रसीद)" },
  payment: { en: "Payment", hi: "भुगतान" },
  journal: { en: "Journal", hi: "जर्नल" },
  contra: { en: "Contra", hi: "कॉन्ट्रा (नकद ↔ बैंक)" },
};
export const MODES = ["cash", "upi", "bank", "cheque", "online", "other"] as const;

export const inr = (n: number | string | null | undefined) => "₹" + Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dmy = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("-") : "");

/** Indian financial year (April–March) bounds containing a date. */
export function fyBounds(d = new Date()): { from: string; to: string; label: string } {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return { from: `${y}-04-01`, to: `${y + 1}-03-31`, label: `${y}-${String((y + 1) % 100).padStart(2, "0")}` };
}

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Download rows as a CSV file (opens in Excel; UTF-8 BOM keeps Hindi intact). */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Open a printable window with the given HTML table (user saves as PDF). */
export function printHtml(title: string, bodyHtml: string) {
  const w = window.open("", "_blank", "width=900,height=700"); if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Mukta,Arial,sans-serif;font-size:12px;color:#111;margin:24px}h1{font-size:18px;margin:0 0 2px}h2{font-size:13px;color:#555;margin:0 0 12px;font-weight:400}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}tr.total td{font-weight:700;background:#fafafa}@media print{body{margin:10mm}}</style></head><body>${bodyHtml}<script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
}
export const h = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
