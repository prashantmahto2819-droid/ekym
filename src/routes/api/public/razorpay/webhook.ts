import { createFileRoute } from "@tanstack/react-router";

/**
 * Razorpay webhook. Signature verified before any processing, every delivery is
 * stored once (idempotent on the Razorpay event id) and then processed.
 */
export const Route = createFileRoute("/api/public/razorpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature");

        const { verifyWebhookSignature } = await import("@/lib/razorpay.server");
        if (!verifyWebhookSignature(raw, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { markDonationPaid } = await import("@/lib/payments.server");

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const eventId =
          request.headers.get("x-razorpay-event-id") ??
          `${payload?.event}-${payload?.payload?.payment?.entity?.id ?? crypto.randomUUID()}`;
        const event = String(payload?.event ?? "unknown");

        // Idempotent inbox write.
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("payment_webhook_events")
          .insert({ provider: "RAZORPAY", event_id: eventId, event, payload } as never)
          .select("id")
          .maybeSingle();

        let rowId = (inserted as { id: string } | null)?.id ?? null;

        if (insertError) {
          if (!insertError.message.toLowerCase().includes("duplicate")) {
            console.error("[razorpay-webhook] inbox write failed", insertError.message);
            return new Response("Storage failure", { status: 500 });
          }
          const { data: existing, error: readError } = await supabaseAdmin
            .from("payment_webhook_events")
            .select("id,processed_at")
            .eq("provider", "RAZORPAY")
            .eq("event_id", eventId)
            .maybeSingle();
          if (readError || !existing) {
            console.error("[razorpay-webhook] inbox read failed", readError?.message);
            return new Response("Storage failure", { status: 500 });
          }
          const row = existing as { id: string; processed_at: string | null };
          if (row.processed_at) return new Response("Already processed", { status: 200 });
          rowId = row.id;
        }

        try {
          const payment = payload?.payload?.payment?.entity;
          if (payment?.order_id && payment?.id) {
            if (event === "payment.captured" || event === "payment.authorized") {
              await markDonationPaid({
                orderId: payment.order_id,
                paymentId: payment.id,
                source: "WEBHOOK",
              });
            } else if (event === "payment.failed") {
              const { data: donation } = await supabaseAdmin
                .from("donations")
                .select("id,status")
                .eq("razorpay_order_id", payment.order_id)
                .maybeSingle();
              const d = donation as { id: string; status: string } | null;
              if (d && d.status !== "PAID") {
                await supabaseAdmin
                  .from("donations")
                  .update({
                    status: "FAILED",
                    razorpay_payment_id: payment.id,
                    failure_reason: payment.error_description ?? "Payment failed",
                  } as never)
                  .eq("id", d.id);
                await supabaseAdmin.from("payment_transactions").insert({
                  donation_id: d.id,
                  razorpay_order_id: payment.order_id,
                  razorpay_payment_id: payment.id,
                  event: "WEBHOOK",
                  status: "FAILED",
                  amount: Number(payment.amount ?? 0) / 100,
                  method: payment.method ?? null,
                  error_code: payment.error_code ?? null,
                  error_description: payment.error_description ?? null,
                  raw: payment,
                } as never);
              }
            }
          }

          if (rowId) {
            await supabaseAdmin
              .from("payment_webhook_events")
              .update({ processed_at: new Date().toISOString(), processing_error: null } as never)
              .eq("id", rowId);
          }
          return new Response("ok", { status: 200 });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[razorpay-webhook] processing failed", message);
          if (rowId) {
            await supabaseAdmin
              .from("payment_webhook_events")
              .update({ processing_error: message } as never)
              .eq("id", rowId);
          }
          // 5xx so Razorpay retries with the same event id.
          return new Response("Processing failed", { status: 500 });
        }
      },
    },
  },
});
