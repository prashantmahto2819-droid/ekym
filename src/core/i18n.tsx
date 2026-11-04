// English is the default site language; Hindi is a toggle. The choice lives in a cookie so SSR renders the same language.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";
export const LANG_COOKIE = "k1_lang";

const dict = {
  en: {
    home: "Home", about: "About us", seva: "Seva Prakalp", blogs: "Blogs", news: "News", magazine: "Magazine", campaigns: "Campaigns",
    gallery: "Gallery", videos: "Videos", reels: "Reels", blood: "Blood donation", library: "Library",
    volunteer: "Volunteer", internship: "Internship", donate: "Donate", contact: "Contact",
    our_seva: "Our seva", get_involved: "Get involved", read_watch: "Read & watch", policies: "Policies",
    privacy: "Privacy policy", terms: "Terms", refund: "Refund policy",
    admin_panel: "Admin panel", my_account: "My account", staff_sign_in: "Staff sign in",
    designed_by: "Designed & Developed by", switch_lang: "हिंदी", menu: "Menu",
    team: "Our team", join: "Become a member", announcements: "Announcements",
  },
  hi: {
    home: "होम", about: "हमारे बारे में", seva: "सेवा प्रकल्प", blogs: "ब्लॉग", news: "समाचार", magazine: "पत्रिका", campaigns: "अभियान",
    gallery: "गैलरी", videos: "वीडियो", reels: "रील्स", blood: "रक्तदान", library: "पुस्तकालय",
    volunteer: "स्वयंसेवक", internship: "इंटर्नशिप", donate: "दान करें", contact: "संपर्क",
    our_seva: "हमारी सेवा", get_involved: "जुड़ें", read_watch: "पढ़ें और देखें", policies: "नीतियाँ",
    privacy: "गोपनीयता नीति", terms: "नियम", refund: "रिफ़ंड नीति",
    admin_panel: "एडमिन पैनल", my_account: "मेरा खाता", staff_sign_in: "स्टाफ़ लॉगिन",
    designed_by: "डिज़ाइन एवं विकास", switch_lang: "English", menu: "मेनू",
    team: "हमारी टीम", join: "सदस्य बनें", announcements: "सूचनाएँ",
  },
} as const;

export type TKey = keyof typeof dict.en;

type Ctx = { lang: Lang; t: (k: TKey) => string; setLang: (l: Lang) => void; loc: <T extends Record<string, unknown>>(row: T | null | undefined, field: string) => string };
const LangContext = createContext<Ctx | null>(null);

export function parseLangCookie(cookie: string | null | undefined): Lang {
  const m = /(?:^|;\s*)k1_lang=(hi|en)/.exec(cookie ?? "");
  return (m?.[1] as Lang | undefined) ?? "en";
}

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const value = useMemo<Ctx>(() => ({
    lang,
    t: (k) => dict[lang][k] ?? dict.en[k],
    setLang: (l) => {
      setLangState(l);
      try {
        document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = l;
      } catch { /* SSR */ }
    },
    // Content rows carry `<field>_hi`; fall back to the English/default field.
    loc: (row, field) => {
      if (!row) return "";
      const hi = lang === "hi" ? (row as Record<string, unknown>)[`${field}_hi`] : null;
      const v = (typeof hi === "string" && hi.trim()) ? hi : (row as Record<string, unknown>)[field];
      return typeof v === "string" ? v : "";
    },
  }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang outside LangProvider");
  return ctx;
}
