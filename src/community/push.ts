// ब्राउज़र / फ़ोन की सिस्टम सूचना (Web Push) चालू / बंद। iPhone पर सिर्फ़ "होम स्क्रीन पर जोड़ा" ऐप (iOS 16.4+) में चलती है।
import { supabase } from "@/integrations/supabase/client";

export type PushState = "unsupported" | "ios-install" | "denied" | "on" | "off";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
const isIOS = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? navigator.serviceWorker.register("/sw.js");
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isIOS() && !standalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

async function publicKey(): Promise<string> {
  const { data } = await supabase.rpc("k1_push_public_key" as never);
  if (data) return data as unknown as string;
  const { data: init, error } = await supabase.functions.invoke("push-send", { body: { action: "init" } });
  if (error || !init?.public_key) throw new Error("सूचना सेवा अभी तैयार नहीं — थोड़ी देर बाद कोशिश करें");
  return init.public_key as string;
}

export async function enablePush(): Promise<PushState> {
  const st = await pushState();
  if (st === "unsupported" || st === "ios-install" || st === "denied") return st;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(await publicKey()) });
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase.rpc("k1_push_subscribe" as never, { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent } as never);
  if (error) throw new Error(error.message);
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) { await supabase.rpc("k1_push_unsubscribe" as never, { p_endpoint: sub.endpoint } as never); await sub.unsubscribe().catch(() => undefined); }
  return "off";
}
