// Per-organization module switches, stored in core.organizations.branding.modules (edited in Admin → Organization settings).
// Missing key = module on. Keys used by nav / home / admin.
export const MODULE_KEYS = [
  ["library", "Library / पुस्तकालय"],
  ["blood", "Blood seva / रक्त सेवा"],
  ["internship", "Research & internships / शोध एवं इंटर्नशिप"],
  ["volunteer", "Volunteer → membership / स्वयंसेवा"],
  ["seva", "Seva projects / सेवा प्रकल्प"],
  ["campaigns", "Campaigns / अभियान"],
  ["donate", "Donations / दान"],
  ["events", "Events / आयोजन"],
  ["community", "Kalchuri One feed"],
  ["directory", "Directory, jobs, scholarships, help"],
  ["matrimony", "Matrimony / वैवाहिक"],
  ["polls", "Polls / मतदान"],
  ["magazine", "Magazine / पत्रिका"],
  ["gallery", "Gallery, videos, reels"],
  ["bhojan", "Bhojan seva (home section)"],
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number][0];

export function moduleOn(branding: unknown, key: string): boolean {
  const m = (branding as { modules?: Record<string, boolean> } | null)?.modules;
  return !m || m[key] !== false;
}
/** Nav / home keys → module key (anything not listed is always on). */
export const NAV_MODULE: Record<string, ModuleKey> = {
  library: "library", blood: "blood", internship: "internship", volunteer: "volunteer", seva: "seva", campaigns: "campaigns",
  donate: "donate", events: "events", community: "community", directory: "directory", jobs: "directory", scholarships: "directory", help: "directory",
  matrimony: "matrimony", polls: "polls", magazine: "magazine", gallery: "gallery", videos: "gallery", reels: "gallery", bhojan: "bhojan",
};
