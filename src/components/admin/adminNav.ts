// Admin menu: groups in working order, every label in pure Hindi and pure English (shown by the chosen language).
import {
  BarChart3, BookOpen, Briefcase, Building2, CalendarDays, ClipboardList, Droplet, FileSignature, FileText, FolderArchive,
  Globe, GraduationCap, HandHeart, HeartPulse, Home, IdCard, Image, Inbox, Landmark, LayoutDashboard, LayoutTemplate,
  LibraryBig, Megaphone, MessageCircle, MessagesSquare, Newspaper, NotebookPen, Palette, PenTool, Receipt, ScrollText,
  Settings, ShieldCheck, Sparkles, Star, Target, Trees, Trophy, Users, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  hi: string;
  en: string;
  icon: LucideIcon;
  /** module key from organization settings; item hidden when the module is off */
  mod?: string;
  /** platform owner (or an organization with child organizations) only */
  platform?: boolean;
  /** search words (both languages) */
  keys?: string;
};
export type NavGroup = { id: string; hi: string; en: string; icon: LucideIcon; items: NavItem[] };

export const SHOKPATRA_URL = "https://shokpatra.kalchuri.org/app.html";

export const ADMIN_NAV: NavGroup[] = [
  {
    id: "home", hi: "मुख्य", en: "Overview", icon: LayoutDashboard, items: [
      { to: "/admin", hi: "डैशबोर्ड", en: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/guide", hi: "उपयोग गाइड", en: "User guide", icon: BookOpen, keys: "help सहायता" },
    ],
  },
  {
    id: "org", hi: "संगठन", en: "Organisation", icon: Building2, items: [
      { to: "/admin/members", hi: "सदस्य व आवेदन", en: "Members & applications", icon: Users, keys: "membership सदस्यता" },
      { to: "/admin/committees", hi: "पदाधिकारी व समितियाँ", en: "Office bearers & committees", icon: UsersRound },
      { to: "/admin/meetings", hi: "बैठकें व प्रस्ताव", en: "Meetings & resolutions", icon: ClipboardList },
      { to: "/admin/tasks", hi: "कार्य सूची", en: "Tasks", icon: Target },
      { to: "/admin/users", hi: "एडमिन व अधिकार", en: "Admins & roles", icon: ShieldCheck, keys: "role permission" },
      { to: "/admin/organizations", hi: "जुड़ी संस्थाएँ", en: "Organisations", icon: Landmark, platform: true },
      { to: "/admin/settings", hi: "संगठन सेटिंग", en: "Organisation settings", icon: Settings, keys: "logo modules लोगो" },
    ],
  },
  {
    id: "services", hi: "सेवाएँ व कार्यक्रम", en: "Services & programmes", icon: HandHeart, items: [
      { to: "/admin/events", hi: "आयोजन व निमंत्रण", en: "Events & invitations", icon: CalendarDays, mod: "events" },
      { to: "/admin/exams", hi: "परीक्षा व प्रतियोगिता", en: "Exams & contests", icon: GraduationCap, mod: "exam" },
      { to: "/admin/blood", hi: "रक्त सेवा", en: "Blood service", icon: Droplet, mod: "blood" },
      { to: "/admin/volunteers", hi: "स्वयंसेवक", en: "Volunteers", icon: HeartPulse, mod: "volunteer" },
      { to: "/admin/seva", hi: "सेवा प्रकल्प", en: "Seva projects", icon: HandHeart, mod: "seva" },
      { to: "/admin/campaigns", hi: "अभियान", en: "Campaigns", icon: Megaphone, mod: "campaigns" },
      { to: "/admin/programs", hi: "शोध व इंटर्नशिप कार्यक्रम", en: "Research & internship programmes", icon: Briefcase, mod: "internship" },
      { to: "/admin/interns", hi: "इंटर्नशिप आवेदन", en: "Internship applications", icon: NotebookPen, mod: "internship" },
      { to: "/admin/library", hi: "पुस्तकालय", en: "Library", icon: LibraryBig, mod: "library" },
    ],
  },
  {
    id: "family", hi: "वंश वृक्ष व शोक", en: "Family tree & condolence", icon: Trees, items: [
      { to: "/admin/families", hi: "परिवार व वंश वृक्ष", en: "Families & family trees", icon: Trees, mod: "shok" },
      { to: "/admin/shok", hi: "शोक संदेश", en: "Condolence messages", icon: ScrollText, mod: "shok" },
      { to: SHOKPATRA_URL, hi: "शोकपत्र सेवा ऐप ↗", en: "Shokpatra app ↗", icon: ScrollText, mod: "shok" },
    ],
  },
  {
    id: "community", hi: "समुदाय व संवाद", en: "Community & messages", icon: MessagesSquare, items: [
      { to: "/admin/community", hi: "सामुदायिक मंच", en: "Community", icon: MessagesSquare, mod: "community", keys: "feed directory matrimony polls वैवाहिक निर्देशिका" },
      { to: "/admin/announcements", hi: "सूचनाएँ", en: "Announcements", icon: Megaphone },
      { to: "/admin/messaging", hi: "WhatsApp व ईमेल", en: "WhatsApp & email", icon: MessageCircle, keys: "sms channel व्हाट्सऐप" },
      { to: "/admin/messages", hi: "संपर्क संदेश", en: "Contact inbox", icon: Inbox },
    ],
  },
  {
    id: "website", hi: "वेबसाइट व प्रकाशन", en: "Website & publishing", icon: Globe, items: [
      { to: "/admin/homepage", hi: "होम पेज", en: "Home page", icon: Home, keys: "slides banner" },
      { to: "/admin/pages", hi: "पेज", en: "Pages", icon: LayoutTemplate },
      { to: "/admin/website", hi: "रंग-रूप, मेनू व डोमेन", en: "Theme, menu & domain", icon: Palette },
      { to: "/admin/media", hi: "फोटो व वीडियो गैलरी", en: "Photo & video gallery", icon: Image, keys: "reels" },
      { to: "/admin/news", hi: "समाचार", en: "News", icon: Newspaper },
      { to: "/admin/blogs", hi: "लेख", en: "Articles", icon: PenTool, keys: "blog ब्लॉग" },
      { to: "/admin/publishing", hi: "पत्रिका", en: "Magazine", icon: BookOpen },
      { to: "/admin/achievements", hi: "उपलब्धियाँ व विचार", en: "Achievements & thoughts", icon: Trophy },
      { to: "/admin/ads", hi: "विज्ञापन", en: "Advertisements", icon: Star },
    ],
  },
  {
    id: "documents", hi: "पत्राचार व दस्तावेज़", en: "Letters & documents", icon: FileText, items: [
      { to: "/admin/studio", hi: "डिज़ाइन स्टूडियो", en: "Design studio", icon: Sparkles, keys: "template टेम्पलेट certificate" },
      { to: "/admin/letters", hi: "पत्र व प्रमाण-पत्र", en: "Letters & certificates", icon: FileSignature },
      { to: "/admin/register", hi: "आवक-जावक रजिस्टर", en: "Inward / outward register", icon: IdCard },
      { to: "/admin/documents", hi: "दस्तावेज़ व इतिहास", en: "Records & history", icon: FolderArchive },
    ],
  },
  {
    id: "accounts", hi: "लेखा", en: "Accounts", icon: Wallet, items: [
      { to: "/admin/donations", hi: "दान", en: "Donations", icon: HandHeart, mod: "donate" },
      { to: "/admin/vouchers", hi: "रसीद व वाउचर", en: "Receipts & vouchers", icon: Receipt },
      { to: "/admin/reports", hi: "बही-खाते व रिपोर्ट", en: "Ledgers & reports", icon: BarChart3 },
      { to: "/admin/accounts", hi: "खाता सूची व वित्त वर्ष", en: "Chart of accounts & years", icon: Wallet },
      { to: "/admin/payments", hi: "ऑनलाइन भुगतान सेटिंग", en: "Online payment settings", icon: Settings, mod: "donate", keys: "razorpay" },
    ],
  },
  {
    id: "system", hi: "व्यवस्था", en: "System", icon: Settings, items: [
      { to: "/admin/health", hi: "सिस्टम स्थिति व बैकअप", en: "System health & backups", icon: HeartPulse, platform: true },
    ],
  },
];

/** The menu item that matches a path best (longest prefix). */
export function activeItem(path: string): { group: NavGroup; item: NavItem } | null {
  let best: { group: NavGroup; item: NavItem } | null = null;
  for (const group of ADMIN_NAV) for (const item of group.items) {
    if (item.to.startsWith("http")) continue;
    const hit = item.to === "/admin" ? path === "/admin" || path === "/admin/" : path === item.to || path.startsWith(item.to + "/");
    if (hit && (!best || item.to.length > best.item.to.length)) best = { group, item };
  }
  return best;
}
