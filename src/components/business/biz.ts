// Business community: types, categories and data hooks (biz_* RPCs, migration cm_16).
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { call } from "@/community/chat";
import { useTenant } from "@/core/tenant-context";

export type Service = { name: string; price?: string; image?: string };
export type BizPage = {
  id: string; organization_id: string; owner_id: string; owner_name: string; slug: string; name: string; category: string; about: string | null;
  logo_url: string | null; cover_url: string | null; phone: string | null; whatsapp: string | null; email: string | null; website: string | null;
  address: string | null; city: string | null; district: string | null; state: string | null; map_url: string | null; hours: string | null; offer: string | null;
  services: Service[]; tier: "free" | "silver" | "gold"; tier_until: string | null; verified: boolean; status: "active" | "blocked"; admin_note: string | null;
  followers: number; posts: number; i_follow: boolean; mine: boolean; can_moderate: boolean; today_posts: number | null; daily_limit: number; created_at: string;
  pending_request?: { id: string; plan: string; period: string; amount: number; created_at: string } | null; sponsored_live?: number;
  rating?: { avg: number | null; count: number }; my_review?: { rating: number; body: string | null } | null;
};
export type BizCardData = { id: string; slug: string; name: string; logo_url: string | null; category: string; city: string | null; verified: boolean; tier: string };

export const CATEGORIES: { key: string; hi: string; en: string; icon: string }[] = [
  { key: "grocery", hi: "किराना / जनरल स्टोर", en: "Grocery / general store", icon: "🛒" },
  { key: "clothing", hi: "कपड़ा / रेडीमेड", en: "Clothing", icon: "👗" },
  { key: "jewellery", hi: "सोना-चाँदी", en: "Jewellery", icon: "💍" },
  { key: "food", hi: "होटल / मिठाई / खान-पान", en: "Food & restaurants", icon: "🍲" },
  { key: "health", hi: "डॉक्टर / दवाई / अस्पताल", en: "Health & medical", icon: "🩺" },
  { key: "education", hi: "स्कूल / कोचिंग", en: "Education & coaching", icon: "📚" },
  { key: "legal", hi: "वकील / CA / सलाह", en: "Legal, CA & consulting", icon: "⚖️" },
  { key: "construction", hi: "निर्माण / ठेकेदार / हार्डवेयर", en: "Construction & hardware", icon: "🏗️" },
  { key: "property", hi: "प्रॉपर्टी", en: "Real estate", icon: "🏠" },
  { key: "electronics", hi: "मोबाइल / इलेक्ट्रॉनिक्स", en: "Mobile & electronics", icon: "📱" },
  { key: "auto", hi: "गाड़ी / गैराज / ट्रांसपोर्ट", en: "Auto & transport", icon: "🚗" },
  { key: "agri", hi: "खेती / बीज / खाद", en: "Agriculture", icon: "🌾" },
  { key: "beauty", hi: "ब्यूटी पार्लर / सैलून", en: "Beauty & salon", icon: "💇" },
  { key: "events", hi: "टेंट / कैटरिंग / शादी सेवा", en: "Events & wedding services", icon: "🎉" },
  { key: "finance", hi: "बीमा / बैंकिंग / लोन", en: "Insurance & finance", icon: "💼" },
  { key: "tech", hi: "IT / डिज़ाइन / प्रिंटिंग", en: "IT, design & printing", icon: "💻" },
  { key: "services", hi: "अन्य सेवाएँ", en: "Other services", icon: "🛠️" },
  { key: "other", hi: "अन्य", en: "Other", icon: "🏪" },
];
export const catOf = (k: string | null | undefined) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[CATEGORIES.length - 1]!;
export const catLabel = (k: string | null | undefined, hi: boolean) => { const c = catOf(k); return hi ? c.hi : c.en; };

export const waLink = (n: string) => `https://wa.me/${n.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`;
export const telLink = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

export function useMyPages(enabled: boolean) {
  return useQuery({ queryKey: ["biz_my_pages"], enabled, staleTime: 30_000, queryFn: () => call<BizPage[]>("biz_my_pages").catch(() => [] as BizPage[]) });
}
export function useBizPage(slug: string) {
  return useQuery({ queryKey: ["biz_page", slug], queryFn: () => call<BizPage | null>("biz_page_get", { p_slug: slug }) });
}
export function useDirectory(f: { q: string; category: string; city: string }) {
  const tenant = useTenant();
  return useQuery({ queryKey: ["biz_directory", tenant.organization_id, f], staleTime: 30_000, queryFn: () => call<BizPage[]>("biz_directory", { p_org: tenant.organization_id, p_q: f.q.trim() || null, p_category: f.category || null, p_city: f.city || null, p_offset: 0, p_limit: 60 }) });
}
export function useBizFacets() {
  const tenant = useTenant();
  return useQuery({ queryKey: ["biz_facets", tenant.organization_id], staleTime: 60_000, queryFn: () => call<{ total: number; categories: { name: string; n: number }[]; cities: { name: string; n: number }[] }>("biz_facets", { p_org: tenant.organization_id }) });
}
export function useBizRefresh() {
  const qc = useQueryClient();
  return () => Promise.all(["biz_my_pages", "biz_page", "biz_directory", "biz_facets", "feed", "biz_sponsor_status", "biz_subs_admin", "biz_page_subs", "biz_reviews", "biz_stats", "biz_boost_admin", "biz_page_boosts", "biz_revenue"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

/* ---- paid plans, paid offline (QR / UPI / bank / cash) and approved by an admin (migration cm_17) ---- */
export type Plan = { key: "silver" | "gold"; name: string; name_hi: string; price_month: number; price_year: number; daily_posts: number; sponsored_per_month: number; sponsored_reach: number; sponsored_days: number; active: boolean; sort: number };
export type PaySettings = { payee_name?: string | null; upi_id?: string | null; qr_url?: string | null; bank_text?: string | null; note?: string | null; boost_price?: number; boost_reach?: number; boost_days?: number };
export type Sub = { id: string; page_id: string; plan: "silver" | "gold"; period: "month" | "year"; amount: number; pay_mode: "upi" | "bank" | "cash" | "grant"; pay_ref: string | null; pay_proof_url: string | null; paid_on: string | null; buyer_name: string | null; buyer_gstin: string | null; buyer_address: string | null; status: "pending" | "approved" | "rejected" | "cancelled"; admin_note: string | null; decided_at: string | null; starts_at: string | null; ends_at: string | null; created_at: string; page_name?: string; page_slug?: string; page_tier?: string; page_tier_until?: string | null; owner_name?: string; owner_phone?: string | null; decided_by_name?: string | null };
export type SponsorStatus = { tier: string; limit: number; used: number; reach: number | null; days: number | null; active: { post_id: string; ends_at: string; delivered: number; reach_cap: number }[] };

export const inr = (n: number | string) => `₹${Number(n).toLocaleString("en-IN")}`;
export const planName = (k: string | null | undefined, hi: boolean) => (k === "gold" ? (hi ? "गोल्ड" : "Gold") : k === "silver" ? (hi ? "सिल्वर" : "Silver") : (hi ? "मुफ़्त" : "Free"));

export function usePlans() {
  return useQuery({ queryKey: ["biz_plans"], staleTime: 300_000, queryFn: () => call<Plan[]>("biz_plans_list").catch(() => [] as Plan[]) });
}
export function usePaySettings(enabled = true) {
  const tenant = useTenant();
  return useQuery({ queryKey: ["biz_pay_settings", tenant.organization_id], enabled, staleTime: 60_000, queryFn: () => call<PaySettings>("biz_pay_settings_get", { p_org: tenant.organization_id }) });
}
export function useSponsorStatus(pageId: string | null) {
  return useQuery({ queryKey: ["biz_sponsor_status", pageId], enabled: !!pageId, queryFn: () => call<SponsorStatus | null>("biz_sponsor_status", { p_page: pageId }) });
}
export const upiLink = (s: PaySettings, amount: number, note: string) =>
  s.upi_id ? `upi://pay?pa=${encodeURIComponent(s.upi_id)}&pn=${encodeURIComponent(s.payee_name ?? "")}&am=${amount}&cu=INR&tn=${encodeURIComponent(note.slice(0, 60))}` : null;

/* ---- phase 4: stats, reviews, ₹99 boost, revenue (migration cm_18) ---- */
export type BizStats = { days: number; events: Partial<Record<"view" | "call" | "whatsapp" | "map" | "website" | "share" | "email", number>>; daily: { day: string; views: number; contacts: number }[]; new_followers: number; followers: number; posts: number; likes: number; comments: number; shares: number; sponsored_reach: number; top_posts: { id: string; body: string; likes: number; comments: number; shares: number; created_at: string }[] };
export type Review = { user_id: string; name: string; photo: string | null; rating: number; body: string | null; reply: string | null; replied_at: string | null; status: "active" | "hidden"; created_at: string; updated_at: string; mine: boolean };
export type BoostOrder = { id: string; page_id: string; post_id: string; amount: number; reach: number; days: number; pay_mode: string; pay_ref: string | null; pay_proof_url: string | null; paid_on: string | null; status: string; admin_note: string | null; decided_at: string | null; created_at: string; page_name?: string; page_slug?: string; owner_name?: string; owner_phone?: string | null; post_body?: string; decided_by_name?: string | null };
export type Revenue = { from: string; to: string; total: number; plans: number; boosts: number; count: number; pending_amount: number; active_paid_pages: number; free_grants: number; by_month: { month: string; plans: number; boosts: number; total: number }[]; rows: { kind: "plan" | "boost"; id: string; decided_at: string; amount: number; pay_mode: string; pay_ref: string | null; what: string; page: string; buyer_name: string | null; buyer_gstin: string | null; owner: string }[] };

export function useBizStats(pageId: string | null, days: number) {
  return useQuery({ queryKey: ["biz_stats", pageId, days], enabled: !!pageId, queryFn: () => call<BizStats | null>("biz_stats", { p_page: pageId, p_days: days }) });
}
export function useReviews(pageId: string | null) {
  return useQuery({ queryKey: ["biz_reviews", pageId], enabled: !!pageId, queryFn: () => call<Review[]>("biz_reviews_list", { p_page: pageId, p_limit: 100 }) });
}
export function useBoostPrice() {
  const tenant = useTenant();
  return useQuery({ queryKey: ["biz_boost_price", tenant.organization_id], staleTime: 300_000, queryFn: () => call<{ price: number; reach: number; days: number }>("biz_boost_price", { p_org: tenant.organization_id }) });
}
const tracked = new Set<string>();
/** Count a page view / contact click (once per kind per page per browser session; the server also de-duplicates). */
export function bizTrack(pageId: string, kind: "view" | "call" | "whatsapp" | "map" | "website" | "share" | "email") {
  const k = `${pageId}:${kind}`;
  try { if (sessionStorage.getItem(`bt:${k}`)) return; sessionStorage.setItem(`bt:${k}`, "1"); } catch { if (tracked.has(k)) return; tracked.add(k); }
  void call("biz_track", { p_page: pageId, p_kind: kind }).catch(() => undefined);
}
