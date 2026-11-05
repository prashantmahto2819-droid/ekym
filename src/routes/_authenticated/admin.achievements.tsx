// समाज की उपलब्धियाँ: members submit, admins approve; approved ones show on /achievements, the home page and in the magazine picker.
// Testimonials (वरिष्ठ सदस्यों के विचार) are managed on the same page.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/achievements")({ component: Page });

export const ACH_CATEGORIES = [{ value: "education", label: "शिक्षा" }, { value: "sports", label: "खेल" }, { value: "service", label: "सेवा" }, { value: "business", label: "व्यवसाय" }, { value: "award", label: "सम्मान / पुरस्कार" }, { value: "culture", label: "कला-संस्कृति" }, { value: "other", label: "अन्य" }];
type Pending = { id: string; person_name: string; person_name_hi: string | null; title: string; title_hi: string | null; description: string | null; category: string; photo_path: string | null; achieved_on: string | null; village: string | null; created_at: string };

function Page() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useQuery({ queryKey: ["ach_pending", tenant.organization_id], queryFn: async () => { const { data, error } = await supabase.from("cm_achievements").select("id,person_name,person_name_hi,title,title_hi,description,category,photo_path,achieved_on,village,created_at").eq("organization_id", tenant.organization_id).eq("status", "pending").order("created_at"); if (error) throw error; return (data ?? []) as Pending[]; } });
  async function decide(p: Pending, ok: boolean) {
    const note = ok ? null : prompt("कारण (जमा करने वाले को भेजा जाएगा)");
    if (!ok && !note) return;
    setBusy(p.id);
    try { const { error } = await supabase.rpc("k1_achievement_decide", { p_id: p.id, p_approve: ok, p_note: note } as never); if (error) throw error; toast.success(ok ? "प्रकाशित" : "अस्वीकार"); qc.invalidateQueries({ queryKey: ["ach_pending"] }); qc.invalidateQueries({ queryKey: ["admin", "cm_achievements"] }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">समाज की उपलब्धियाँ व विचार</h1>
        <p className="mt-1 text-sm text-muted-foreground">सदस्यों की उपलब्धियाँ (शिक्षा, खेल, सेवा, व्यवसाय, सम्मान) — सदस्य खुद जमा कर सकते हैं, यहाँ मंज़ूरी दीजिए। मंज़ूर उपलब्धियाँ वेबसाइट, होम पेज और पत्रिका में आती हैं।</p>
      </div>
      {pending.data?.length ? (
        <section className="surface-card p-4">
          <h2 className="font-display text-lg font-semibold">मंज़ूरी बाकी ({pending.data.length})</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {pending.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                {p.photo_path ? <img src={p.photo_path} alt="" className="size-12 rounded object-cover" /> : null}
                <div className="min-w-0 flex-1"><p className="font-medium">{p.person_name_hi || p.person_name} — {p.title_hi || p.title}</p><p className="text-xs text-muted-foreground">{[ACH_CATEGORIES.find((c) => c.value === p.category)?.label, p.village, p.achieved_on].filter(Boolean).join(" · ")}</p>{p.description ? <p className="mt-1 line-clamp-2 text-xs">{p.description}</p> : null}</div>
                <Button size="sm" disabled={busy === p.id} onClick={() => decide(p, true)}>प्रकाशित करें</Button>
                <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => decide(p, false)}>अस्वीकार</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <CrudPage
        table="cm_achievements"
        title="उपलब्धियाँ"
        description="सीधे यहाँ भी जोड़ सकते हैं (status approved)। 'featured' वाली होम पेज पर पहले दिखती हैं।"
        orderBy="achieved_on"
        defaults={{ status: "approved", category: "other" }}
        columns={[{ key: "person_name", label: "नाम", render: (r) => r.person_name_hi || r.person_name }, { key: "title", label: "उपलब्धि", render: (r) => r.title_hi || r.title }, { key: "category", label: "श्रेणी", render: (r) => ACH_CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category }, { key: "achieved_on", label: "तिथि" }, { key: "status", label: "स्थिति" }]}
        fields={[
          { key: "person_name", label: "व्यक्ति का नाम (English)", required: true }, { key: "person_name_hi", label: "नाम (हिंदी)" },
          { key: "title", label: "उपलब्धि (English)", required: true }, { key: "title_hi", label: "उपलब्धि (हिंदी)" },
          { key: "category", label: "श्रेणी", type: "select", options: ACH_CATEGORIES },
          { key: "achieved_on", label: "तिथि", type: "date" }, { key: "village", label: "गाँव / शहर" },
          { key: "photo_path", label: "फोटो", type: "image" },
          { key: "status", label: "स्थिति", type: "select", options: ["approved", "pending", "rejected"] },
          { key: "featured", label: "होम पेज पर प्रमुख", type: "checkbox" },
          { key: "description", label: "विवरण (English)", type: "textarea", full: true }, { key: "description_hi", label: "विवरण (हिंदी)", type: "textarea", full: true },
        ]}
      />
      <CrudPage
        table="testimonials"
        title="विचार / प्रशंसापत्र (Testimonials)"
        description="समाज के वरिष्ठ सदस्यों, पदाधिकारियों या लाभार्थियों के विचार — About और होम पेज के 'Voices' section में दिखते हैं (section चालू हो तो)।"
        orderBy="display_order"
        ascending
        defaults={{ active: true, approved: true }}
        columns={[{ key: "name", label: "नाम" }, { key: "role", label: "परिचय / पद" }, { key: "city", label: "शहर" }, { key: "active", label: "चालू", render: (r) => (r.active ? "हाँ" : "नहीं") }]}
        fields={[
          { key: "name", label: "नाम", required: true }, { key: "role", label: "परिचय / पद (जैसे: वरिष्ठ सदस्य, पूर्व अध्यक्ष)" }, { key: "city", label: "शहर / गाँव" },
          { key: "photo", label: "फोटो", type: "image" },
          { key: "message", label: "विचार (English)", type: "textarea", full: true, required: true }, { key: "message_hi", label: "विचार (हिंदी)", type: "textarea", full: true },
          { key: "display_order", label: "क्रम", type: "number" }, { key: "active", label: "चालू", type: "checkbox" },
        ]}
      />
    </div>
  );
}
