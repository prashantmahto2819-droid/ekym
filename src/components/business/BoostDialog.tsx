// ₹99 single-post boost for any business page (free pages too): pay by QR / UPI / bank / cash, enter the UTR,
// an admin checks the payment and the post goes into everyone's "For you" feed for a few days.
import { ImagePlus, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inr, useBizRefresh, useBoostPrice } from "@/components/business/biz";
import { PayInfo } from "@/components/business/PlanDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { call, uploadCommunityImage } from "@/community/chat";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";

export function BoostDialog({ postId, pageName, postText, hi, onClose }: { postId: string; pageName: string; postText: string | null; hi: boolean; onClose: () => void }) {
  const tenant = useTenant();
  const { user } = useAuth();
  const price = useBoostPrice();
  const refresh = useBizRefresh();
  const [mode, setMode] = useState<"upi" | "bank" | "cash">("upi");
  const [ref, setRef] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [proof, setProof] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const L = (h: string, e: string) => (hi ? h : e);
  const p = price.data ?? { price: 99, reach: 1000, days: 3 };
  async function upload(f: File | undefined) {
    if (!f || !user) return; setBusy("proof");
    try { setProof(await uploadCommunityImage(f, `${tenant.organization_id}/biz/${user.id}`, 1400)); } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(null); }
  }
  async function submit() {
    if (mode !== "cash" && ref.trim().length < 6) { toast.error(L("भुगतान का UTR / ट्रांज़ैक्शन नंबर लिखें", "Enter the UTR / transaction number")); return; }
    setBusy("send");
    try {
      await call("biz_boost_order", { p_post: postId, p_pay_mode: mode, p_ref: ref.trim() || null, p_proof: proof, p_paid_on: paidOn });
      await refresh();
      toast.success(L("बूस्ट अनुरोध भेजा — एडमिन भुगतान जाँचकर पोस्ट बूस्ट कर देंगे।", "Boost request sent — an admin will check the payment and start it."));
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-5 py-3"><DialogTitle className="flex items-center gap-2 font-display text-lg"><Rocket className="size-5 text-orange-600" />{L("पोस्ट बूस्ट करें", "Boost this post")}</DialogTitle></DialogHeader>
        <div className="space-y-4 p-5">
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 p-4 text-white">
            <p className="font-display text-2xl font-bold">{inr(p.price)}</p>
            <p className="text-sm text-white/90">{L(`यह पोस्ट ${p.days} दिन तक समाज के ${p.reach.toLocaleString("en-IN")} लोगों के "आपके लिए" फ़ीड में "प्रायोजित" के रूप में दिखेगी — पहले आपके ज़िले के लोगों को।`, `This post will show as "Sponsored" in ${p.reach.toLocaleString("en-IN")} members' "For you" feed for ${p.days} days — people in your district first.`)}</p>
            {postText ? <p className="mt-2 line-clamp-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs">“{postText}”</p> : null}
          </div>
          <PayInfo amount={p.price} note={`${pageName} boost`} hi={hi} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span className="font-medium">{L("कैसे भुगतान किया", "Paid by")}</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="upi">UPI / QR</option><option value="bank">{L("बैंक ट्रांसफ़र", "Bank transfer")}</option><option value="cash">{L("नकद (एडमिन को)", "Cash (to an admin)")}</option>
              </select></label>
            <label className="space-y-1 text-sm"><span className="font-medium">{L("भुगतान की तारीख़", "Date paid")}</span><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></label>
            {mode !== "cash" ? <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">{L("UTR / ट्रांज़ैक्शन नंबर", "UTR / transaction number")} *</span><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 431812345678" inputMode="numeric" /></label> : null}
            <div className="flex items-center gap-3 text-sm sm:col-span-2">{proof ? <img src={proof} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-border" /> : null}<label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1.5 hover:bg-secondary"><ImagePlus className="size-4" />{busy === "proof" ? "…" : L("स्क्रीनशॉट (वैकल्पिक)", "Screenshot (optional)")}<input type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={!!busy}>{L("रहने दें", "Cancel")}</Button><Button className="bg-gradient-to-r from-orange-500 to-rose-600 text-white" onClick={() => void submit()} disabled={!!busy}>{busy === "send" ? "…" : L("भुगतान कर दिया — भेजें", "I've paid — send")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
