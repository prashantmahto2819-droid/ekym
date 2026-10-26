import { createHmac, timingSafeEqual } from "node:crypto";

/** Razorpay REST helper. Secrets are read at call time and never leave the server. */

export type RazorpayConfig = { keyId: string; keySecret: string };

export function getRazorpayConfig(): RazorpayConfig {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret) {
    throw new Error(
      "Online payments are not configured yet. Please add the Razorpay Key ID and Key Secret.",
    );
  }
  return { keyId, keySecret };
}

export function razorpayConfigured(): boolean {
  return !!process.env["RAZORPAY_KEY_ID"] && !!process.env["RAZORPAY_KEY_SECRET"];
}

function authHeader({ keyId, keySecret }: RazorpayConfig) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = getRazorpayConfig();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(cfg),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[razorpay] ${path} failed [${res.status}]: ${text}`);
    throw new Error(`Payment gateway error [${res.status}]: ${text}`);
  }
  return JSON.parse(text) as T;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
};

export function createRazorpayOrder(input: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
  });
}

export type RazorpayPayment = {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  currency: string;
  method?: string;
  error_code?: string | null;
  error_description?: string | null;
};

export function fetchRazorpayPayment(paymentId: string) {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

function safeEqualHex(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Checkout handback signature: HMAC(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = getRazorpayConfig();
  const expected = createHmac("sha256", keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, input.signature);
}

/** Webhook signature: HMAC(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
