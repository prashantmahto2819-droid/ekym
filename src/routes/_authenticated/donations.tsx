import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { receiptDownloadUrl } from "@/lib/donations.functions";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/donations")({
  head: ({ matches }) => ({
    meta: [
      { title: `My donations — ${siteName(matches)}` },
      { name: "description", content: "Your donation history and receipts." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DonorPortal,
});

type Row = {
  id: string;
  donation_id: string;
  amount: number;
  status: string;
  purpose: string | null;
  donation_type: string;
  paid_at: string | null;
  created_at: string;
  donation_receipts: { receipt_number: string }[] | null;
};

function DonorPortal() {
  const download = useServerFn(receiptDownloadUrl);

  const q = useQuery({
    queryKey: ["my-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select(
          "id,donation_id,amount,status,purpose,donation_type,paid_at,created_at,donation_receipts(receipt_number)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const total = (q.data ?? [])
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  async function open(receiptNumber: string) {
    try {
      const { url } = await download({ data: { receiptNumber } });
      window.open(url, "_blank", "noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the receipt");
    }
  }

  return (
    <>
      <PageHeader
        title="My donations"
        description="Every confirmed donation and its receipt."
        crumbs={[{ label: "My donations" }]}
      />
      <section className="section-y">
        <div className="container-page">
          <div className="surface-card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total donated</p>
              <p className="font-display text-2xl font-semibold">{formatCurrency(total)}</p>
            </div>
            <Button asChild>
              <Link to="/donate">Donate again</Link>
            </Button>
          </div>

          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (q.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No donations linked to this account yet. If you donated as a guest, use{" "}
              <Link to="/donation-status" className="text-primary underline">
                donation status
              </Link>{" "}
              with your donation ID.
            </p>
          ) : (
            <div className="surface-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left">
                  <tr>
                    <th className="px-4 py-3">Donation ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.data ?? []).map((r) => {
                    const receipt = r.donation_receipts?.[0]?.receipt_number;
                    return (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{r.donation_id}</td>
                        <td className="px-4 py-3">{formatDateTime(r.paid_at ?? r.created_at)}</td>
                        <td className="px-4 py-3">{r.purpose ?? r.donation_type}</td>
                        <td className="px-4 py-3">{formatCurrency(Number(r.amount))}</td>
                        <td className="px-4 py-3">{r.status}</td>
                        <td className="px-4 py-3">
                          {receipt ? (
                            <Button size="sm" variant="outline" onClick={() => open(receipt)}>
                              <Download className="size-4" /> {receipt}
                            </Button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
