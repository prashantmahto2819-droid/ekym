// Shared bits of the level certificate programme (public pages).
import { useQuery } from "@tanstack/react-query";

import { sb } from "@/components/exams/db";

export type Track = { id: string; slug: string; grp: string; name: string; name_hi: string | null; description: string | null; description_hi: string | null; class_from: number | null; class_to: number | null; subjects: string[]; social_share: number; questions_per_paper: number; duration_minutes: number; pass_percent: number; passed_level: number; attempts: number; bank: Record<string, number> | null };
export type MyLevel = { id: string; track_id: string; track: string; track_hi: string | null; level: number; paper_no: number; started_at: string; submitted_at: string | null; percent: number | null; passed: boolean | null; token: string | null; cert_no: string | null };

export const LEVELS: { hi: string; en: string; color: string }[] = [
  { hi: "प्रारंभिक", en: "Foundation", color: "bg-sky-100 text-sky-900 border-sky-300" },
  { hi: "कांस्य", en: "Bronze", color: "bg-orange-100 text-orange-900 border-orange-300" },
  { hi: "रजत", en: "Silver", color: "bg-slate-100 text-slate-900 border-slate-300" },
  { hi: "स्वर्ण", en: "Gold", color: "bg-amber-100 text-amber-900 border-amber-300" },
  { hi: "विशेषज्ञ", en: "Expert", color: "bg-violet-100 text-violet-900 border-violet-300" },
];
export function useTracks(org: string) {
  return useQuery({ queryKey: ["ex_tracks", org], queryFn: async () => { const { data, error } = await sb.rpc("ex_tracks_list", { p_org: org }); if (error) throw error; return (data ?? []) as unknown as Track[]; } });
}

