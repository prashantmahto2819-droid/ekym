// चैट म्यूट: 1 घंटा / 8 घंटे / 1 दिन / 1 हफ़्ता / हमेशा / चालू करें (RPC k1_chat_mute_for)
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { call } from "@/community/chat";

export function useChatMutes(enabled = true) {
  return useQuery({ queryKey: ["chat_mutes"], enabled, staleTime: 30_000, queryFn: () => call<{ room_id: string; muted_until: string | null }[]>("k1_chat_mutes").catch(() => []) });
}
export const isMuted = (mutes: { room_id: string; muted_until: string | null }[] | undefined, roomId: string) => {
  const m = mutes?.find((x) => x.room_id === roomId);
  return !!m && (!m.muted_until || Date.parse(m.muted_until) > Date.now());
};

const OPTS: [number | null, string, string][] = [[60, "1 घंटे के लिए", "For 1 hour"], [480, "8 घंटे के लिए", "For 8 hours"], [1440, "1 दिन के लिए", "For 1 day"], [10080, "1 हफ़्ते के लिए", "For 1 week"], [null, "हमेशा के लिए", "Always"]];

export function MuteMenu({ roomId, L, className = "", iconClass = "size-4" }: { roomId: string; L: boolean; className?: string; iconClass?: string }) {
  const qc = useQueryClient();
  const mutes = useChatMutes();
  const m = mutes.data?.find((x) => x.room_id === roomId);
  const on = isMuted(mutes.data, roomId);
  async function set(min: number | null) {
    try {
      await call("k1_chat_mute_for", { p_room: roomId, p_minutes: min === null ? -1 : min });
      await Promise.all([qc.invalidateQueries({ queryKey: ["chat_mutes"] }), qc.invalidateQueries({ queryKey: ["chat_flags"] }), qc.invalidateQueries({ queryKey: ["chat_unread"] })]);
      toast.success(min === 0 ? (L ? "सूचनाएँ फिर चालू" : "Unmuted") : (L ? "म्यूट किया" : "Muted"));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`grid place-items-center rounded-full hover:bg-black/10 ${className}`} title={on ? (L ? "म्यूट है" : "Muted") : (L ? "म्यूट करें" : "Mute")}>
        {on ? <BellOff className={iconClass} /> : <Bell className={iconClass} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">{on ? (m?.muted_until ? `${L ? "म्यूट है, तक:" : "Muted until"} ${new Date(m.muted_until).toLocaleString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : (L ? "हमेशा के लिए म्यूट" : "Muted always")) : (L ? "इस चैट की सूचना बंद करें" : "Mute this chat")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTS.map(([v, hi, en]) => <DropdownMenuItem key={String(v)} onClick={() => void set(v)}>🔕 {L ? hi : en}</DropdownMenuItem>)}
        {on ? <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => void set(0)}>🔔 {L ? "सूचनाएँ फिर चालू करें" : "Unmute"}</DropdownMenuItem></> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
