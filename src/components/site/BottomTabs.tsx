// Phone bottom tab bar (like an app): होम · चौपाल · चैट (unread count) · आयोजन · मैं / लॉग इन. Hidden from lg up,
// on admin / sign-in pages, and inside the chat page (which has its own composer at the bottom).
import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, MessageCircle, Newspaper, UserRound } from "lucide-react";

import { useChatUnread } from "@/community/chat";
import { moduleOn } from "@/core/modules";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";

export function BottomTabs() {
  const tenant = useTenant();
  const L = useLang().lang === "hi";
  const { user, orgs } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const community = moduleOn(tenant.branding, "community");
  const chatOn = !!user && orgs.length > 0 && community;
  const unread = useChatUnread(chatOn);
  if (path.startsWith("/community/chat")) return null;
  const tabs = [
    { to: "/", label: L ? "होम" : "Home", icon: Home, active: path === "/" },
    ...(community ? [{ to: "/community", label: L ? "चौपाल" : "Wall", icon: Newspaper, active: path === "/community" || path.startsWith("/community/") || path.startsWith("/business") }] : []),
    ...(chatOn ? [{ to: "/community/chat", label: L ? "चैट" : "Chat", icon: MessageCircle, active: false, badge: unread.data ?? 0 }] : []),
    { to: "/events", label: L ? "आयोजन" : "Events", icon: CalendarDays, active: path.startsWith("/events") },
    user
      ? { to: "/me/profile", label: L ? "मैं" : "Me", icon: UserRound, active: path.startsWith("/me") || path.startsWith("/account") || path === `/u/${user.id}` }
      : { to: "/auth", label: L ? "लॉग इन" : "Sign in", icon: UserRound, active: false },
  ];
  return (
    <>
      <div className="h-16 lg:hidden" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label={L ? "मुख्य टैब" : "Main tabs"}>
        <ul className="mx-auto flex max-w-lg">
          {tabs.map((t) => (
            <li key={t.to} className="flex-1">
              <Link to={t.to as "/"} className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${t.active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t.active ? <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" /> : null}
                <span className="relative">
                  <t.icon className="size-6" strokeWidth={t.active ? 2.4 : 1.8} />
                  {"badge" in t && t.badge ? <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{t.badge > 99 ? "99+" : t.badge}</span> : null}
                </span>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
