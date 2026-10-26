import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, FileDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { receiptDownloadUrl } from "@/lib/donations.functions";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/donations")({
  component: AdminDonations,
});

type Row = {
  id: string;
  donation_id: string;
  donor_name: string;
  donor_mobile: string;
  donor_email: string | null;
  pan: string | null;
  city: string | null;
  state: string | null;
  amount: number;
  status: string;
  donation_type: string;
  purpose: string | null;
  payment_method: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  donation_receipts: { receipt_number: string }[] | null;
};

const STATUSES = ["ALL", "PAID", "PENDING", "CREATED", "FAILED", "REFUNDED", "CANCELLED"];

function toCsv(rows: Row[]) {
  const head = [
    "Donation ID",
    "Receipt",
    "Date",
    "Donor",
    "Mobile",
    "Email",
    "PAN",
    "City",
    "State",
    "Type",
    "Purpose",
    "Amount",
    "Status",
    "Method",
    "Payment ref",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [
      r.donation_id,
      r.donation_receipts?.[0]?.receipt_number ?? "",
      r.paid_at ?? r.created_at,
      r.donor_name,
      r.donor_mobile,
      r.donor_email,
      r.pan,
      r.city,
      r.state,
      r.donation_type,
      r.purpose,
      Number(r.amount),
      r.status,
      r.payment_method,
      r.razorpay_payment_id,
    ]
      .map(esc)
      .join(","),
  );
  return [head.map(esc).join(","), ...body].join("\n");
}

function AdminDonations() {
  const [status, setStatus] = useState("PAID");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const download = useServerFn(receiptDownloadUrl);

  const q = useQuery({
    queryKey: ["admin", "donations", status, from, to],
    queryFn: async () => {
      let query = supabase
        .from("donations")
        .select(
          "id,donation_id,donor_name,donor_mobile,donor_email,pan,city,state,amount,status,donation_type,purpose,payment_method,razorpay_payment_id,paid_at,created_at,donation_receipts(receipt_number)",
        )
        .order("created_at", { ascending: false })
        .limit(1000);
      if (status !== "ALL") query = query.eq("status", status as never);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", `${to}T23:59:59`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = q.data ?? [];
    if (!term) return all;
    return all.filter((r) =>
      [r.donation_id, r.donor_name, r.donor_mobile, r.donor_email, r.razorpay_payment_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [q.data, search]);

  const total = rows
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openReceipt(receiptNumber: string) {
    try {
      const { url } = await download({ data: { receiptNumber } });
      window.open(url, "_blank", "noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the receipt");
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Donations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Only server-verified payments are marked paid. Receipts open through short-lived private links.
      </p>

      <div className="surface-card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Status</span>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">From</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">To</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="text-sm lg:col-span-2">
          <span className="mb-1 block text-muted-foreground">Search</span>
          <Input
            placeholder="Donation ID, name, mobile, payment reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-muted-foreground">Paid total in view: </span>
          <span className="font-display text-lg font-semibold">{formatCurrency(total)}</span>
          <span className="text-muted-foreground"> · {rows.length} records</span>
        </p>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <FileDown className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="surface-card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-3 py-3">Donation ID</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Donor</th>
              <th className="px-3 py-3">Mobile</th>
              <th className="px-3 py-3">Purpose</th>
              <th className="px-3 py-3">Amount</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-muted-foreground">
                  No donations match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const receipt = r.donation_receipts?.[0]?.receipt_number;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-3 font-medium">{r.donation_id}</td>
                    <td className="px-3 py-3">{formatDateTime(r.paid_at ?? r.created_at)}</td>
                    <td className="px-3 py-3">{r.donor_name}</td>
                    <td className="px-3 py-3">{r.donor_mobile}</td>
                    <td className="px-3 py-3">{r.purpose ?? r.donation_type}</td>
                    <td className="px-3 py-3">{formatCurrency(Number(r.amount))}</td>
                    <td className="px-3 py-3">{r.status}</td>
                    <td className="px-3 py-3">
                      {receipt ? (
                        <Button size="sm" variant="outline" onClick={() => openReceipt(receipt)}>
                          <Download className="size-4" /> {receipt}
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
