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
  return () => Promise.all(["biz_my_pages", "biz_page", "biz_directory", "biz_facets", "feed"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}
