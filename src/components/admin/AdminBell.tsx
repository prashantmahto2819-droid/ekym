// Admin notifications bell: in-app alerts (new members, organization registrations, contact messages …)
// written by the database (k1_admin_notify). Polls every 60 s; unread count in the badge.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

export type AdminNotif = { id: string; organization_id: string | null; org_name: string | null; kind: string; title: string; body: string | null; link: string | null; priority: number; read_at: string | null; created_at: string };

export function useAdminNotifications() {
  return useQuery({
    queryKey: ["k1_admin_notifications"],
    queryFn: async () => { const { data, error } = await supabase.rpc("k1_admin_notifications", { p_limit: 40 } as never); if (error) throw new Error(error.message); return (data ?? []) as unknown as AdminNotif[]; },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "अभी";
  if (s < 3600) return `${Math.floor(s / 60)} मिनट पहले`;
  if (s < 86400) return `${Math.floor(s / 3600)} घंटे पहले`;
  return `${Math.floor(s / 86400)} दिन पहले`;
}

export function AdminBell() {
  const qc = useQueryClient();
  const q = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;
  async function markAll() {
    await supabase.rpc("k1_admin_notifications_read", { p_ids: null } as never);
    qc.invalidateQueries({ queryKey: ["k1_admin_notifications"] });
  }
  async function markOne(id: string) {
    await supabase.rpc("k1_admin_notifications_read", { p_ids: [id] } as never);
    qc.invalidateQueries({ queryKey: ["k1_admin_notifications"] });
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="relative" aria-label="सूचनाएँ">
          <Bell className="size-4" />
          {unread ? <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unread > 99 ? "99+" : unread}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
          <b>सूचनाएँ</b>
          {unread ? <button className="text-xs text-muted-foreground underline" onClick={markAll}>सब पढ़ी हुई करें</button> : null}
        </div>
        <ul className="max-h-[60vh] divide-y divide-border overflow-auto text-sm">
          {items.length === 0 ? <li className="px-3 py-6 text-center text-muted-foreground">कोई सूचना नहीं</li> : null}
          {items.map((n) => (
            <li key={n.id} className={n.read_at ? "opacity-70" : "bg-primary/5"}>
              <Link to={(n.link ?? "/admin") as "/admin"} onClick={() => { setOpen(false); if (!n.read_at) void markOne(n.id); }} className="block px-3 py-2 hover:bg-secondary">
                <p className="font-medium leading-tight">{n.priority >= 2 ? "⭐ " : ""}{n.title}</p>
                {n.body ? <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{n.body}</p> : null}
                <p className="mt-0.5 text-[11px] text-muted-foreground">{n.org_name ? `${n.org_name} · ` : ""}{ago(n.created_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
