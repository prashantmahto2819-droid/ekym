import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/core/i18n";
import { ensureVillage, loadVillages, phoneCheck, validPhone } from "@/family/api";
import { useAuth } from "@/hooks/use-auth";
import { normPhone } from "@/lib/comms";
import { useFamilyCtx } from "@/family/hooks";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/families/")({ component: FamiliesPage });

type Row = { id: string; family_name: string; village_name: string | null; main_whatsapp: string | null; status: string; members: number; head_name: string | null; owner_id: string; created_at: string; mine: boolean; managed: boolean };

function FamiliesPage() {
  const { lang } = useLang();
  const L = lang === "hi";
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const ctx = useFamilyCtx();
  const [newOpen, setNewOpen] = useState(false);
  const rows = useQuery({
    queryKey: ["k1_families", status, q],
    enabled: ctx.data?.approved === true,
    queryFn: async () => { const { data, error } = await supabase.rpc("k1_families", { p_status: status || null, p_q: q.trim() || null, p_limit: 300 } as never); if (error) throw error; return (data ?? []) as unknown as Row[]; },
  });

  if (ctx.data && !ctx.data.approved) {
    return (
      <div className="rounded-lg border border-border bg-background p-6 text-sm">
        <h1 className="font-display text-xl font-semibold">{L ? "वंश वृक्ष" : "Family trees"}</h1>
        <p className="mt-2 text-muted-foreground">{L ? "वंश वृक्ष देखने के लिए आपका खाता शोकपत्र में मंज़ूर होना चाहिए, या किसी संगठन में आपको 'Family tree' की भूमिका मिली हो।" : "To view family trees your account must be approved in the family-tree app, or you need a 'Family tree' role in an organization."}</p>
      </div>
    );
  }

  const list = rows.data ?? [];
  const sections: [string, Row[]][] = [
    [L ? "मेरे परिवार" : "My families", list.filter((r) => r.mine)],
    [L ? "मेरे क्षेत्र के परिवार" : "Families I manage", list.filter((r) => !r.mine && r.managed)],
    [L ? "निर्देशिका (मंज़ूर)" : "Directory (approved)", list.filter((r) => !r.mine && !r.managed)],
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{L ? "वंश वृक्ष" : "Family trees"}</h1>
          <p className="text-sm text-muted-foreground">{L ? "परिवार चुनें और पूरा वंश चार्ट देखें। जुड़े हुए परिवारों का संयुक्त वंश 'पूरा वंश' में दिखता है।" : "Open a family to see its chart. Linked families combine into a full lineage view."}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setNewOpen(true)}>+ {L ? "नया परिवार" : "New family"}</Button>
          <Input placeholder={L ? "परिवार / गाँव खोजें" : "Search family / village"} value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{L ? "सभी स्थिति" : "All statuses"}</option>
            {["draft", "pending", "approved", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </header>

      {sections.map(([title, items]) => items.length ? (
        <section key={title} className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span></h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f) => (
              <Link key={f.id} to="/admin/families/$id" params={{ id: f.id }} className="rounded-lg border border-border bg-background p-3 transition hover:border-primary/50 hover:shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold">{f.family_name}</p>
                    <p className="text-xs text-muted-foreground">{f.head_name ? `${L ? "मुखिया" : "Head"}: ${f.head_name}` : (L ? "मुखिया दर्ज नहीं" : "No head yet")}{f.village_name ? ` · ${f.village_name}` : ""}</p>
                  </div>
                  <Badge variant={f.status === "approved" ? "default" : f.status === "rejected" ? "destructive" : "secondary"}>{f.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{f.members} {L ? "सदस्य" : "members"}{f.main_whatsapp ? ` · ${f.main_whatsapp}` : ""}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null)}
      {rows.isSuccess && !list.length ? <p className="text-sm text-muted-foreground">{L ? "कोई परिवार नहीं मिला।" : "No families found."}</p> : null}
      {rows.error ? <p className="text-sm text-destructive">{(rows.error as Error).message}</p> : null}
      <p className="text-xs text-muted-foreground">{L ? "पुराना शोकपत्र ऐप भी चलता रहेगा; दोनों एक ही डेटा पर काम करते हैं।" : "The shokpatra app keeps working; both use the same data."} <Button asChild size="sm" variant="link"><a href="https://shokpatra.vividbrandify.com/app.html" target="_blank" rel="noreferrer">shokpatra ↗</a></Button></p>
      <NewFamilyDialog open={newOpen} onClose={() => setNewOpen(false)} L={L} />
    </div>
  );
}

function NewFamilyDialog({ open, onClose, L }: { open: boolean; onClose: () => void; L: boolean }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [village, setVillage] = useState("");
  const [busy, setBusy] = useState(false);
  const villages = useQuery({ queryKey: ["villages"], queryFn: loadVillages, enabled: open, staleTime: 300000 });
  async function create() {
    if (!name.trim()) { toast.error(L ? "परिवार का नाम लिखिए।" : "Enter the family name."); return; }
    if (!validPhone(wa)) { toast.error(L ? "सही 10 अंकों का व्हाट्सएप नंबर लिखिए।" : "Enter a valid 10-digit WhatsApp number."); return; }
    if (!village.trim()) { toast.error(L ? "गाँव या शहर लिखिए।" : "Enter the village or city."); return; }
    setBusy(true);
    try {
      const hits = await phoneCheck(wa);
      if (hits.length && !confirm(L ? `यह नंबर पहले से "${hits[0]!.name ?? ""} ${hits[0]!.family_name ?? ""}" के पास है। फिर भी बनाएँ?` : `This number already belongs to "${hits[0]!.name ?? ""} ${hits[0]!.family_name ?? ""}". Create anyway?`)) { setBusy(false); return; }
      const village_id = await ensureVillage(village, villages.data ?? []);
      const { data, error } = await supabase.from("families").insert({ family_name: name.trim(), main_whatsapp: normPhone(wa), village_id, owner_id: user!.id } as never).select("id").single();
      if (error) throw error;
      onClose();
      nav({ to: "/admin/families/$id", params: { id: (data as { id: string }).id } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{L ? "नया परिवार" : "New family"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-sm">
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{L ? "परिवार का नाम (जैसे: कश्यप परिवार)" : "Family name (e.g. Kashyap family)"}</span><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{L ? "मुखिया का मुख्य व्हाट्सएप नंबर (10 अंक) — शोक संदेश इसी पर जाएगा" : "Head's main WhatsApp (10 digits) — condolence messages go here"}</span><Input inputMode="numeric" maxLength={12} value={wa} onChange={(e) => setWa(e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{L ? "गाँव या शहर" : "Village or city"}</span><Input list="k1-villages-new" value={village} onChange={(e) => setVillage(e.target.value)} /><datalist id="k1-villages-new">{(villages.data ?? []).map((v) => <option key={v.id} value={v.name} />)}</datalist></label>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>{L ? "रद्द" : "Cancel"}</Button><Button onClick={create} disabled={busy}>{L ? "परिवार बनाएँ" : "Create"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
